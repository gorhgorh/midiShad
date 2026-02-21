import { useModuleStore } from './moduleStore'
import { useMidiStore } from './midiStore'
import { useLfoStore, type LfoSlotId } from './lfoStore'
import { useClockStore } from './clockStore'
import { createDefaultLfo } from '../lfo/engine'

const KEYS = {
  device: 'midishad:device',
  module: 'midishad:module',
  mappings: 'midishad:mappings',
  relativeFlags: 'midishad:relativeFlags',
  lfoConfigs: 'midishad:lfoConfigs',
  lfos: 'midishad:lfos',
  lfoAssignments: 'midishad:lfoAssignments',
  lfoAssignmentStrengths: 'midishad:lfoAssignmentStrengths',
  lfoParamMods: 'midishad:lfoParamMods',
  lfoParamBaseValues: 'midishad:lfoParamBaseValues',
  lfoAssignmentDividers: 'midishad:lfoAssignmentDividers',
  clock: 'midishad:clock',
  paramCache: 'midishad:paramCache',
  optionCache: 'midishad:optionCache',
} as const

export function loadPersisted() {
  try {
    const moduleId = localStorage.getItem(KEYS.module)
    if (moduleId) useModuleStore.getState().setActiveModule(moduleId)

    const deviceId = localStorage.getItem(KEYS.device)
    if (deviceId) useMidiStore.getState().setSelectedDevice(deviceId)

    const mappingsRaw = localStorage.getItem(KEYS.mappings)
    if (mappingsRaw) {
      useMidiStore.setState({ mappings: JSON.parse(mappingsRaw) })
    }

    const relRaw = localStorage.getItem(KEYS.relativeFlags)
    if (relRaw) {
      useMidiStore.setState({ relativeFlags: JSON.parse(relRaw) })
    }

    // New LFO format — merge with defaults so missing/stale fields get filled
    const lfosRaw = localStorage.getItem(KEYS.lfos)
    if (lfosRaw) {
      const persisted = JSON.parse(lfosRaw)
      const merged: Record<string, unknown> = {}
      for (const key of ['lfo1', 'lfo2', 'lfo3', 'lfo4']) {
        merged[key] = { ...createDefaultLfo(), ...persisted[key] }
      }
      useLfoStore.setState({ lfos: merged } as Partial<ReturnType<typeof useLfoStore.getState>>)
    }

    const assignRaw = localStorage.getItem(KEYS.lfoAssignments)
    if (assignRaw) {
      useLfoStore.setState({ assignments: JSON.parse(assignRaw) })
    }

    const assignStrRaw = localStorage.getItem(KEYS.lfoAssignmentStrengths)
    if (assignStrRaw) {
      useLfoStore.setState({ assignmentStrengths: JSON.parse(assignStrRaw) })
    }

    const assignDivRaw = localStorage.getItem(KEYS.lfoAssignmentDividers)
    if (assignDivRaw) {
      useLfoStore.setState({ assignmentDividers: JSON.parse(assignDivRaw) })
    }

    const lfoParamModsRaw = localStorage.getItem(KEYS.lfoParamMods)
    if (lfoParamModsRaw) {
      useLfoStore.setState({ lfoParamMods: JSON.parse(lfoParamModsRaw) })
    }

    const lfoParamBaseValuesRaw = localStorage.getItem(KEYS.lfoParamBaseValues)
    if (lfoParamBaseValuesRaw) {
      useLfoStore.setState({ lfoParamBaseValues: JSON.parse(lfoParamBaseValuesRaw) })
    }

    // Legacy LFO configs migration
    const lfoRaw = localStorage.getItem(KEYS.lfoConfigs)
    if (lfoRaw && !lfosRaw) {
      const oldConfigs = JSON.parse(lfoRaw)
      const assignments: Record<string, LfoSlotId | null> = {}
      for (const [paramName, cfg] of Object.entries(oldConfigs)) {
        const c = cfg as { enabled: boolean; period: number }
        if (c.enabled) assignments[paramName] = 'lfo1'
      }
      useLfoStore.setState({ assignments, configs: oldConfigs })
    }

    // Clock
    const clockRaw = localStorage.getItem(KEYS.clock)
    if (clockRaw) {
      const clock = JSON.parse(clockRaw)
      if (clock.bpm) useClockStore.getState().setBpm(clock.bpm)
      if (clock.source) useClockStore.getState().setSource(clock.source)
    }

    // Param/option caches
    const paramCacheRaw = localStorage.getItem(KEYS.paramCache)
    if (paramCacheRaw) {
      useModuleStore.setState({ paramCache: JSON.parse(paramCacheRaw) })
    }
    const optionCacheRaw = localStorage.getItem(KEYS.optionCache)
    if (optionCacheRaw) {
      useModuleStore.setState({ optionCache: JSON.parse(optionCacheRaw) })
    }
  } catch {
    // ignore corrupt localStorage
  }
}

export function saveAll() {
  const mod = useModuleStore.getState()
  if (mod.activeModule) localStorage.setItem(KEYS.module, mod.activeModule.id)
  localStorage.setItem(KEYS.paramCache, JSON.stringify(mod.paramCache))
  localStorage.setItem(KEYS.optionCache, JSON.stringify(mod.optionCache))

  const midi = useMidiStore.getState()
  if (midi.selectedDeviceId) localStorage.setItem(KEYS.device, midi.selectedDeviceId)
  localStorage.setItem(KEYS.mappings, JSON.stringify(midi.mappings))
  localStorage.setItem(KEYS.relativeFlags, JSON.stringify(midi.relativeFlags))

  const lfo = useLfoStore.getState()
  localStorage.setItem(KEYS.lfos, JSON.stringify(lfo.lfos))
  localStorage.setItem(KEYS.lfoAssignments, JSON.stringify(lfo.assignments))
  localStorage.setItem(KEYS.lfoAssignmentStrengths, JSON.stringify(lfo.assignmentStrengths))
  localStorage.setItem(KEYS.lfoAssignmentDividers, JSON.stringify(lfo.assignmentDividers))
  localStorage.setItem(KEYS.lfoConfigs, JSON.stringify(lfo.configs))
  localStorage.setItem(KEYS.lfoParamMods, JSON.stringify(lfo.lfoParamMods))
  localStorage.setItem(KEYS.lfoParamBaseValues, JSON.stringify(lfo.lfoParamBaseValues))

  const clock = useClockStore.getState()
  localStorage.setItem(KEYS.clock, JSON.stringify({ bpm: clock.bpm, source: clock.source }))
}
