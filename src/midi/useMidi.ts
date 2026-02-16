import { useEffect, useState, useCallback } from 'react'
import { parseCc, normalizeCc, applyRelativeCc } from './midiUtils'
import { useMidiStore, getMappingsForDevice, isParamRelative } from '../store/midiStore'
import { useShaderStore } from '../store/shaderStore'

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

    function onMessage(e: MIDIMessageEvent) {
      const msg = parseCc(e.data as Uint8Array)
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

        // Find next param without a CC (assignCc sets learnTarget to null, so re-read mappings)
        const updatedMapping = getMappingsForDevice(deviceId)
        const { activeShader } = useShaderStore.getState()
        const nextUnassigned = activeShader.params.find(
          (p) => updatedMapping[p.name] == null
        )
        if (nextUnassigned) {
          useMidiStore.getState().setLearnTarget(nextUnassigned.name)
        }
        return
      }

      // Normal mode: find param mapped to this CC and update
      const mapping = getMappingsForDevice(deviceId)
      const { activeShader, paramValues } = useShaderStore.getState()

      for (const [paramName, ccNum] of Object.entries(mapping)) {
        if (ccNum === msg.cc) {
          const param = activeShader.params.find((p) => p.name === paramName)
          if (!param) continue

          if (isParamRelative(deviceId, paramName)) {
            const current = paramValues[paramName] ?? param.default
            const ccVal = param.invert ? 128 - msg.value : msg.value
            const next = applyRelativeCc(ccVal, current, param.min, param.max)
            if (next !== null) {
              useShaderStore.getState().setParamValue(paramName, next)
            }
          } else {
            const ccVal = param.invert ? 127 - msg.value : msg.value
            const val = normalizeCc(ccVal, param.min, param.max)
            useShaderStore.getState().setParamValue(paramName, val)
          }
        }
      }
    }

    input.onmidimessage = onMessage
    return () => { input.onmidimessage = null }
  }, [access, selectedDeviceId])
}
