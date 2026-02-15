import { create } from 'zustand'

export type CcMapping = Record<string, number>        // paramName -> ccNumber
export type DeviceMappings = Record<string, CcMapping> // deviceId -> CcMapping
export type RelativeFlags = Record<string, Record<string, boolean>> // deviceId -> paramName -> isRelative

export interface MidiDeviceInfo {
  id: string
  name: string
}

interface MidiState {
  selectedDeviceId: string | null
  devices: MidiDeviceInfo[]
  mappings: DeviceMappings
  relativeFlags: RelativeFlags
  learnTarget: string | null

  setSelectedDevice: (id: string | null) => void
  setDevices: (devices: MidiDeviceInfo[]) => void
  setLearnTarget: (paramName: string | null) => void
  assignCc: (deviceId: string, paramName: string, ccNumber: number) => void
  unassignParam: (deviceId: string, paramName: string) => void
  toggleRelative: (deviceId: string, paramName: string) => void
}

export const useMidiStore = create<MidiState>((set) => ({
  selectedDeviceId: null,
  devices: [],
  mappings: {},
  relativeFlags: {},
  learnTarget: null,

  setSelectedDevice: (id) => set({ selectedDeviceId: id }),
  setDevices: (devices) => set({ devices }),
  setLearnTarget: (paramName) => set({ learnTarget: paramName }),

  assignCc: (deviceId, paramName, ccNumber) =>
    set((s) => ({
      mappings: {
        ...s.mappings,
        [deviceId]: { ...s.mappings[deviceId], [paramName]: ccNumber },
      },
      learnTarget: null,
    })),

  unassignParam: (deviceId, paramName) =>
    set((s) => {
      const deviceMap = { ...s.mappings[deviceId] }
      delete deviceMap[paramName]
      return { mappings: { ...s.mappings, [deviceId]: deviceMap } }
    }),

  toggleRelative: (deviceId, paramName) =>
    set((s) => {
      const deviceFlags = s.relativeFlags[deviceId] ?? {}
      return {
        relativeFlags: {
          ...s.relativeFlags,
          [deviceId]: { ...deviceFlags, [paramName]: !deviceFlags[paramName] },
        },
      }
    }),
}))

/** Read mappings for a device — use outside selectors (getState() or event handlers) */
export function getMappingsForDevice(deviceId: string): CcMapping {
  return useMidiStore.getState().mappings[deviceId] ?? {}
}

/** Check if a param is in relative mode */
export function isParamRelative(deviceId: string, paramName: string): boolean {
  return !!useMidiStore.getState().relativeFlags[deviceId]?.[paramName]
}
