import { useEffect, useRef } from 'react'
import { useAtomValue } from 'jotai'
import { appStore } from '../atoms/store'
import { normalizeCc, applyRelativeCc } from './midiUtils'
import {
  midiSourceAtom,
  serverConnectedAtom,
  serverDevicesAtom,
  selectedServerDeviceAtom,
  serverMaxRateAtom,
  mappingsAtom,
  relativeFlagsAtom,
  learnTargetAtom,
  assignCcAtom,
  getMappingsForDevice,
  isParamRelative,
  type ServerMidiFrame,
} from '../atoms/midiAtoms'
import {
  activeModuleAtom,
  paramValuesAtom,
} from '../atoms/moduleAtoms'
import {
  seenCcsAtom,
  lfoLearnTargetAtom,
  setLfoParamModAtom,
  type LfoSlotId,
} from '../atoms/lfoAtoms'
import { pushDebugMessage } from '../atoms/midiDebugAtoms'
import { ccState, notifyCcChange } from '../render/ccState'
import { callBridge } from '../render/moduleBridge'
import type { LfoParamName } from '@almst/lfo'

const WS_URL = `ws://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:9900`

export function useServerMidi() {
  const midiSource = useAtomValue(midiSourceAtom)
  const maxRate = useAtomValue(serverMaxRateAtom)
  const wsRef = useRef<WebSocket | null>(null)
  const disposedRef = useRef(false)

  useEffect(() => {
    // Only connect if source includes server
    if (midiSource !== 'server' && midiSource !== 'all') {
      // Disconnect if connected
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
        appStore.set(serverConnectedAtom, false)
      }
      return
    }

    disposedRef.current = false
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      if (disposedRef.current) return

      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        if (disposedRef.current) {
          ws.close()
          return
        }
        appStore.set(serverConnectedAtom, true)
        // Subscribe to MIDI frame channel
        ws.send(JSON.stringify({
          type: 'subscribe',
          channels: ['midi.*.frame', 'midi.*.clock.bpm'],
          maxRate,
        }))
      }

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type !== 'batch' || !msg.values) return

          const seenDevices = new Set<string>()

          for (const [channel, value] of Object.entries(msg.values)) {
            const parts = channel.split('.')
            if (parts[0] !== 'midi') continue

            const deviceName = parts[1]

            // Frame channel: midi.{device}.frame
            if (parts.length === 3 && parts[2] === 'frame') {
              seenDevices.add(deviceName)

              // Check if this device is selected (or none selected = accept all)
              const selectedDevice = appStore.get(selectedServerDeviceAtom)
              if (selectedDevice && selectedDevice !== deviceName) continue

              const frame = value as ServerMidiFrame

              if (frame.cc.length === 0) continue

              // Get state once per frame (not per CC)
              const deviceId = `server:${deviceName}`
              const lfoLearnTarget = appStore.get(lfoLearnTargetAtom)
              const learnTarget = appStore.get(learnTargetAtom)
              const mappings = appStore.get(mappingsAtom)
              const relFlags = appStore.get(relativeFlagsAtom)
              const mapping = getMappingsForDevice(deviceId, mappings)
              const activeModule = appStore.get(activeModuleAtom)
              const atomParamValues = appStore.get(paramValuesAtom)

              // Batch updates
              const paramUpdates: Record<string, number> = {}
              const baseValueUpdates: Record<string, number> = {}
              const newCcs: number[] = []

              // Process each CC value
              for (const [cc, val] of frame.cc) {
                // Push to debug log (DOM-based, zero Jotai)
                pushDebugMessage([0xB0, cc, val])

                // Mutate ccState in place (zero alloc)
                if (!(cc in ccState.ccValues)) newCcs.push(cc)
                ccState.ccValues[cc] = val
                notifyCcChange(cc, val)

                // Handle LFO param learn mode
                if (lfoLearnTarget) {
                  if (val === 64) continue // Skip relative knob reset
                  const dot = lfoLearnTarget.indexOf('.')
                  if (dot !== -1) {
                    const lfoId = lfoLearnTarget.substring(0, dot) as LfoSlotId
                    const param = lfoLearnTarget.substring(dot + 1) as LfoParamName
                    appStore.set(setLfoParamModAtom, { lfoId, param, source: { type: 'cc', ccNumber: cc } })
                    appStore.set(lfoLearnTargetAtom, null)
                  }
                  continue
                }

                // Handle module param learn mode
                if (learnTarget) {
                  if (val === 64) continue // Skip relative knob reset
                  const existingMapping = getMappingsForDevice(deviceId, mappings)
                  const usedCcs = new Set(Object.values(existingMapping))
                  if (usedCcs.has(cc)) continue
                  appStore.set(assignCcAtom, { deviceId, paramName: learnTarget, ccNumber: cc })
                  // Auto-advance to next unassigned param
                  const updatedMappings = appStore.get(mappingsAtom)
                  const updatedMapping = getMappingsForDevice(deviceId, updatedMappings)
                  if (activeModule) {
                    const nextUnassigned = activeModule.params.find(
                      (p) => updatedMapping[p.name] == null
                    )
                    if (nextUnassigned) {
                      appStore.set(learnTargetAtom, nextUnassigned.name)
                    }
                  }
                  continue
                }

                // Normal mode: collect param updates
                if (activeModule) {
                  for (const [paramName, ccNum] of Object.entries(mapping)) {
                    if (ccNum === cc) {
                      const param = activeModule.params.find((p) => p.name === paramName)
                      if (!param) continue

                      let paramVal: number
                      if (isParamRelative(deviceId, paramName, relFlags)) {
                        const current = paramUpdates[paramName] ?? ccState.paramValues[paramName] ?? atomParamValues[paramName] ?? param.default
                        const next = applyRelativeCc(val, current, param.min, param.max)
                        if (next === null) continue
                        paramVal = next
                      } else {
                        paramVal = normalizeCc(val, param.min, param.max)
                      }

                      paramUpdates[paramName] = paramVal
                      baseValueUpdates[paramName] = paramVal
                    }
                  }
                }
              }

              // Update seenCcs when new CCs first appear (rare, Jotai OK)
              if (newCcs.length > 0) {
                const seenCcs = appStore.get(seenCcsAtom)
                const merged = [...new Set([...seenCcs, ...newCcs])].sort((a, b) => a - b)
                appStore.set(seenCcsAtom, merged)
              }

              // Accumulate in ccState and call bridge (zero Jotai)
              if (Object.keys(paramUpdates).length > 0) {
                Object.assign(ccState.paramValues, paramUpdates)
                Object.assign(ccState.baseValues, baseValueUpdates)
                callBridge(paramUpdates, baseValueUpdates)
              }

              // Push note to debug log if present
              if (frame.note && frame.note.velocity > 0) {
                pushDebugMessage([0x90, frame.note.note, frame.note.velocity])
              }
            }
          }

          // Update known server devices
          if (seenDevices.size > 0) {
            const currentDevices = appStore.get(serverDevicesAtom)
            const newDevices = [...new Set([...currentDevices, ...seenDevices])]
            if (newDevices.length !== currentDevices.length) {
              appStore.set(serverDevicesAtom, newDevices)
            }
          }
        } catch {
          // ignore parse errors
        }
      }

      ws.onclose = () => {
        appStore.set(serverConnectedAtom, false)
        wsRef.current = null
        // Reconnect after 2s
        if (!disposedRef.current) {
          reconnectTimer = setTimeout(connect, 2000)
        }
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()

    return () => {
      disposedRef.current = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      appStore.set(serverConnectedAtom, false)
    }
  }, [midiSource, maxRate])
}
