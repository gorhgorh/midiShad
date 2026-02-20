import { useEffect, useState, useCallback } from 'react'
import { parseCc, normalizeCc, applyRelativeCc } from './midiUtils'
import { useMidiStore, getMappingsForDevice, isParamRelative } from '../store/midiStore'
import { useModuleStore } from '../store/moduleStore'
import { useLfoStore } from '../store/lfoStore'
import { useClockStore } from '../store/clockStore'

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

      // Learn mode
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
      if (!activeModule) return

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
          // Also update LFO base value so bipolar LFO centers on user's knob position
          useLfoStore.getState().setBaseValue(paramName, val)
        }
      }
    }

    input.onmidimessage = onMessage
    return () => { input.onmidimessage = null }
  }, [access, selectedDeviceId])
}
