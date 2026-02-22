import { useEffect, useState, useCallback } from 'react'
import { useAtomValue } from 'jotai'
import createDebug from 'debug'
import { parseCc, normalizeCc, applyRelativeCc } from './midiUtils'

const dbg = createDebug('ply:midi')
import { appStore } from '../atoms/store'
import {
  selectedDeviceIdAtom,
  devicesAtom,
  mappingsAtom,
  relativeFlagsAtom,
  learnTargetAtom,
  assignCcAtom,
  getMappingsForDevice,
  isParamRelative,
  midiSourceAtom,
} from '../atoms/midiAtoms'
import {
  activeModuleAtom,
  paramValuesAtom,
} from '../atoms/moduleAtoms'
import {
  lfoLearnTargetAtom,
  setLfoParamModAtom,
  seenCcsAtom,
  type LfoSlotId,
} from '../atoms/lfoAtoms'
import { bpmAtom, clockSourceAtom } from '../atoms/clockAtoms'
import { pushDebugMessage } from '../atoms/midiDebugAtoms'
import { ccState, notifyCcChange } from '../render/ccState'
import { callBridge } from '../render/moduleBridge'
import type { LfoParamName } from '@almst/lfo'

// MIDI clock: 24 pulses per quarter note (ppqn)
const MIDI_CLOCK = 0xF8
const CLOCK_PPQ = 24

export function useMidi() {
  const [access, setAccess] = useState<MIDIAccess | null>(null)
  const selectedDeviceId = useAtomValue(selectedDeviceIdAtom)

  const requestAccess = useCallback(async () => {
    try {
      const ma = await navigator.requestMIDIAccess()
      setAccess(ma)
    } catch {
      dbg('WebMIDI not available')
    }
  }, [])

  // Request access on mount
  useEffect(() => {
    requestAccess()
  }, [requestAccess])

  // Enumerate devices when access changes
  useEffect(() => {
    if (!access) return

    function updateDevices() {
      const list: { id: string; name: string }[] = []
      access!.inputs.forEach((input) => {
        list.push({ id: input.id, name: input.name ?? input.id })
      })
      appStore.set(devicesAtom, list)
    }

    updateDevices()
    access.onstatechange = updateDevices
    return () => { access.onstatechange = null }
  }, [access])

  // Listen on selected device
  useEffect(() => {
    if (!access || !selectedDeviceId) return

    const input = access.inputs.get(selectedDeviceId)
    if (!input) return

    // MIDI clock BPM detection
    let clockCount = 0
    let lastClockTime = 0

    function onMessage(e: MIDIMessageEvent) {
      const data = e.data as Uint8Array
      if (!data || data.length === 0) return

      // Check if local MIDI is enabled
      const source = appStore.get(midiSourceAtom)
      if (source !== 'local' && source !== 'all') return

      // Push to debug log (skip clock & active sensing) — DOM-based, zero Jotai
      if (data[0] !== 0xF8 && data[0] !== 0xFE) {
        pushDebugMessage(Array.from(data))
      }

      // Handle MIDI clock messages
      if (data[0] === MIDI_CLOCK) {
        const source = appStore.get(clockSourceAtom)
        if (source !== 'midi') return

        const now = performance.now()
        clockCount++

        if (clockCount >= CLOCK_PPQ) {
          if (lastClockTime > 0) {
            const elapsed = now - lastClockTime
            const bpm = Math.round(60000 / elapsed)
            if (bpm > 20 && bpm < 300) {
              appStore.set(bpmAtom, bpm)
            }
          }
          lastClockTime = now
          clockCount = 0
        }
        return
      }

      const msg = parseCc(data)
      if (!msg) return

      const deviceId = appStore.get(selectedDeviceIdAtom)
      if (!deviceId) return

      // LFO param CC learn mode (separate from module param learn)
      const lfoLearnTarget = appStore.get(lfoLearnTargetAtom)
      if (lfoLearnTarget) {
        if (msg.value === 64) return // Skip relative knob reset
        // lfoLearnTarget is like "lfo1.strength" — parse it
        const dot = lfoLearnTarget.indexOf('.')
        if (dot !== -1) {
          const lfoId = lfoLearnTarget.substring(0, dot) as LfoSlotId
          const param = lfoLearnTarget.substring(dot + 1) as LfoParamName
          appStore.set(setLfoParamModAtom, { lfoId, param, source: { type: 'cc', ccNumber: msg.cc } })
          appStore.set(lfoLearnTargetAtom, null)
        }
        return
      }

      // Module param learn mode
      const learnTarget = appStore.get(learnTargetAtom)
      if (learnTarget) {
        // Skip 64 reset pulses from relative knobs
        if (msg.value === 64) return

        // Skip CC numbers already assigned to other params on this device
        const mappings = appStore.get(mappingsAtom)
        const existingMapping = getMappingsForDevice(deviceId, mappings)
        const usedCcs = new Set(Object.values(existingMapping))
        if (usedCcs.has(msg.cc)) return

        // Assign and auto-advance to next unassigned param
        appStore.set(assignCcAtom, { deviceId, paramName: learnTarget, ccNumber: msg.cc })

        // Find next param without a CC
        const updatedMappings = appStore.get(mappingsAtom)
        const updatedMapping = getMappingsForDevice(deviceId, updatedMappings)
        const activeModule = appStore.get(activeModuleAtom)
        if (activeModule) {
          const nextUnassigned = activeModule.params.find(
            (p) => updatedMapping[p.name] == null
          )
          if (nextUnassigned) {
            appStore.set(learnTargetAtom, nextUnassigned.name)
          }
        }
        return
      }

      // Normal mode: update CC value in ccState (zero alloc)
      const isNewCc = !(msg.cc in ccState.ccValues)
      ccState.ccValues[msg.cc] = msg.value
      notifyCcChange(msg.cc, msg.value)

      // Only update seenCcs when a new CC is first seen (rare, Jotai OK)
      if (isNewCc) {
        const seenCcs = appStore.get(seenCcsAtom)
        appStore.set(seenCcsAtom, [...seenCcs, msg.cc].sort((a, b) => a - b))
      }

      const mappings = appStore.get(mappingsAtom)
      const relFlags = appStore.get(relativeFlagsAtom)
      const mapping = getMappingsForDevice(deviceId, mappings)
      const activeModule = appStore.get(activeModuleAtom)
      const atomParamValues = appStore.get(paramValuesAtom)

      if (activeModule) {
        const paramUpdates: Record<string, number> = {}
        for (const [paramName, ccNum] of Object.entries(mapping)) {
          if (ccNum === msg.cc) {
            const param = activeModule.params.find((p) => p.name === paramName)
            if (!param) continue

            let val: number
            if (isParamRelative(deviceId, paramName, relFlags)) {
              const current = ccState.paramValues[paramName] ?? atomParamValues[paramName] ?? param.default
              const next = applyRelativeCc(msg.value, current, param.min, param.max)
              if (next === null) continue
              val = next
            } else {
              val = normalizeCc(msg.value, param.min, param.max)
            }

            paramUpdates[paramName] = val
          }
        }
        if (Object.keys(paramUpdates).length > 0) {
          Object.assign(ccState.paramValues, paramUpdates)
          Object.assign(ccState.baseValues, paramUpdates)
          callBridge(paramUpdates, paramUpdates)
        }
      }
    }

    input.onmidimessage = onMessage
    return () => { input.onmidimessage = null }
  }, [access, selectedDeviceId])
}
