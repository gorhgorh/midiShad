import { useEffect, useState, useCallback } from 'react'
import { parseCc, normalizeCc, applyRelativeCc } from './midiUtils'
import { useMidiStore, getMappingsForDevice, isParamRelative } from '../store/midiStore'
import { useModuleStore } from '../store/moduleStore'
import { useLfoStore } from '../store/lfoStore'
import { useClockStore } from '../store/clockStore'
import { useMidiDebugStore } from '../components/MidiDebugPanel'

// MIDI clock: 24 pulses per quarter note (ppqn)
const MIDI_CLOCK = 0xF8
const CLOCK_PPQ = 24

export function useMidi() {
  const [access, setAccess] = useState<MIDIAccess | null>(null)
  const selectedDeviceId = useMidiStore((s) => s.selectedDeviceId)

  const requestAccess = useCallback(async () => {
    try {
      const ma = await navigator.requestMIDIAccess()
      setAccess(ma)
    } catch {
      console.warn('WebMIDI not available')
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
      useMidiStore.getState().setDevices(list)
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

      // Push to debug log (skip clock & active sensing)
      if (data[0] !== 0xF8 && data[0] !== 0xFE) {
        useMidiDebugStore.getState().push(Array.from(data))
      }

      // Handle MIDI clock messages
      if (data[0] === MIDI_CLOCK) {
        const { source } = useClockStore.getState()
        if (source !== 'midi') return

        const now = performance.now()
        clockCount++

        if (clockCount >= CLOCK_PPQ) {
          if (lastClockTime > 0) {
            const elapsed = now - lastClockTime
            const bpm = Math.round(60000 / elapsed)
            if (bpm > 20 && bpm < 300) {
              useClockStore.getState().setBpm(bpm)
            }
          }
          lastClockTime = now
          clockCount = 0
        }
        return
      }

      const msg = parseCc(data)
      if (!msg) return

      const deviceId = useMidiStore.getState().selectedDeviceId
      if (!deviceId) return

      // LFO param CC learn mode (separate from module param learn)
      const { lfoLearnTarget } = useLfoStore.getState()
      if (lfoLearnTarget) {
        if (msg.value === 64) return // Skip relative knob reset
        // lfoLearnTarget is like "lfo1.strength" — parse it
        const dot = lfoLearnTarget.indexOf('.')
        if (dot !== -1) {
          const lfoId = lfoLearnTarget.substring(0, dot) as import('../store/lfoStore').LfoSlotId
          const param = lfoLearnTarget.substring(dot + 1) as import('../lfo/engine').LfoParamName
          useLfoStore.getState().setLfoParamMod(lfoId, param, { type: 'cc', ccNumber: msg.cc })
          useLfoStore.getState().setLfoLearnTarget(null)
        }
        return
      }

      // Module param learn mode
      const { learnTarget } = useMidiStore.getState()
      if (learnTarget) {
        // Skip 64 reset pulses from relative knobs
        if (msg.value === 64) return

        // Skip CC numbers already assigned to other params on this device
        const existingMapping = getMappingsForDevice(deviceId)
        const usedCcs = new Set(Object.values(existingMapping))
        if (usedCcs.has(msg.cc)) return

        // Assign and auto-advance to next unassigned param
        useMidiStore.getState().assignCc(deviceId, learnTarget, msg.cc)

        // Find next param without a CC
        const updatedMapping = getMappingsForDevice(deviceId)
        const { activeModule } = useModuleStore.getState()
        if (activeModule) {
          const nextUnassigned = activeModule.params.find(
            (p) => updatedMapping[p.name] == null
          )
          if (nextUnassigned) {
            useMidiStore.getState().setLearnTarget(nextUnassigned.name)
          }
        }
        return
      }

      // Normal mode: find param mapped to this CC and update
      const mapping = getMappingsForDevice(deviceId)
      const { activeModule, paramValues } = useModuleStore.getState()

      // Collect all lfoStore updates into one setState call (ccValue + baseValues)
      const lfoUpdates: Record<string, unknown> = {}
      lfoUpdates.ccValues = { ...useLfoStore.getState().ccValues, [msg.cc]: msg.value }

      if (activeModule) {
        const baseValueUpdates: Record<string, number> = {}
        for (const [paramName, ccNum] of Object.entries(mapping)) {
          if (ccNum === msg.cc) {
            const param = activeModule.params.find((p) => p.name === paramName)
            if (!param) continue

            let val: number
            if (isParamRelative(deviceId, paramName)) {
              const current = paramValues[paramName] ?? param.default
              const next = applyRelativeCc(msg.value, current, param.min, param.max)
              if (next === null) continue
              val = next
            } else {
              val = normalizeCc(msg.value, param.min, param.max)
            }

            useModuleStore.getState().setParamValue(paramName, val)
            baseValueUpdates[paramName] = val
          }
        }
        if (Object.keys(baseValueUpdates).length > 0) {
          lfoUpdates.baseValues = { ...useLfoStore.getState().baseValues, ...baseValueUpdates }
        }
      }

      // Single lfoStore update for ccValue + baseValues
      useLfoStore.setState(lfoUpdates as Partial<ReturnType<typeof useLfoStore.getState>>)
    }

    input.onmidimessage = onMessage
    return () => { input.onmidimessage = null }
  }, [access, selectedDeviceId])
}
