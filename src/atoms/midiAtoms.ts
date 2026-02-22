import { atom } from 'jotai'

export type CcMapping = Record<string, number>        // paramName -> ccNumber
export type DeviceMappings = Record<string, CcMapping> // deviceId -> CcMapping
export type RelativeFlags = Record<string, Record<string, boolean>> // deviceId -> paramName -> isRelative

export interface MidiDeviceInfo {
  id: string
  name: string
}

// MIDI input source: local (WebMIDI), server (WS), or all
export type MidiSource = 'local' | 'server' | 'all'
export const midiSourceAtom = atom<MidiSource>('local')

// Server MIDI frame state (from WS)
export interface ServerMidiFrame {
  note: { note: number; velocity: number; duration: number } | null
  cc: Array<[number, number]>
}
export const serverMidiFrameAtom = atom<ServerMidiFrame | null>(null)
export const serverConnectedAtom = atom<boolean>(false)

// Server device selection (device name from server)
export const serverDevicesAtom = atom<string[]>([])
export const selectedServerDeviceAtom = atom<string | null>(null)

// Server subscription rate (Hz) - lower = less CPU usage
export const serverMaxRateAtom = atom<number>(30)

// --- Primitive atoms ---
export const selectedDeviceIdAtom = atom<string | null>(null)
export const devicesAtom = atom<MidiDeviceInfo[]>([])
export const mappingsAtom = atom<DeviceMappings>({})
export const relativeFlagsAtom = atom<RelativeFlags>({})
export const learnTargetAtom = atom<string | null>(null)

// --- Write atoms (actions) ---
export const assignCcAtom = atom(
  null,
  (get, set, { deviceId, paramName, ccNumber }: { deviceId: string; paramName: string; ccNumber: number }) => {
    const mappings = get(mappingsAtom)
    set(mappingsAtom, {
      ...mappings,
      [deviceId]: { ...mappings[deviceId], [paramName]: ccNumber },
    })
    set(learnTargetAtom, null)
  },
)

export const unassignParamAtom = atom(
  null,
  (get, set, { deviceId, paramName }: { deviceId: string; paramName: string }) => {
    const mappings = get(mappingsAtom)
    const deviceMap = { ...mappings[deviceId] }
    delete deviceMap[paramName]
    set(mappingsAtom, { ...mappings, [deviceId]: deviceMap })
  },
)

export const toggleRelativeAtom = atom(
  null,
  (get, set, { deviceId, paramName }: { deviceId: string; paramName: string }) => {
    const flags = get(relativeFlagsAtom)
    const deviceFlags = flags[deviceId] ?? {}
    set(relativeFlagsAtom, {
      ...flags,
      [deviceId]: { ...deviceFlags, [paramName]: !deviceFlags[paramName] },
    })
  },
)

// --- Imperative helpers (used outside React, e.g. in MIDI handler) ---
export { appStore } from './store'

export function getMappingsForDevice(deviceId: string, mappings: DeviceMappings): CcMapping {
  return mappings[deviceId] ?? {}
}

export function isParamRelative(deviceId: string, paramName: string, flags: RelativeFlags): boolean {
  return !!flags[deviceId]?.[paramName]
}
