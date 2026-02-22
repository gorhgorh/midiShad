import { appStore } from './store'
import {
  activeModuleAtom,
  paramValuesAtom,
  paramCacheAtom,
  optionCacheAtom,
  setActiveModuleAtom,
} from './moduleAtoms'
import {
  selectedDeviceIdAtom,
  mappingsAtom,
  relativeFlagsAtom,
} from './midiAtoms'
import {
  lfosAtom,
  assignmentsAtom,
  assignmentStrengthsAtom,
  assignmentDividersAtom,
  lfoParamModsAtom,
  lfoParamBaseValuesAtom,
  lfoConfigsAtom,
  baseValuesAtom,
  ccValuesAtom,
  type LfoSlotId,
} from './lfoAtoms'
import { bpmAtom, clockSourceAtom } from './clockAtoms'
import { createDefaultLfo } from '@almst/lfo'
import { ccState } from '../render/ccState'

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
    if (moduleId) appStore.set(setActiveModuleAtom, moduleId)

    const deviceId = localStorage.getItem(KEYS.device)
    if (deviceId) appStore.set(selectedDeviceIdAtom, deviceId)

    const mappingsRaw = localStorage.getItem(KEYS.mappings)
    if (mappingsRaw) appStore.set(mappingsAtom, JSON.parse(mappingsRaw))

    const relRaw = localStorage.getItem(KEYS.relativeFlags)
    if (relRaw) appStore.set(relativeFlagsAtom, JSON.parse(relRaw))

    // New LFO format — merge with defaults so missing/stale fields get filled
    const lfosRaw = localStorage.getItem(KEYS.lfos)
    if (lfosRaw) {
      const persisted = JSON.parse(lfosRaw)
      const merged: Record<string, unknown> = {}
      for (const key of ['lfo1', 'lfo2', 'lfo3', 'lfo4']) {
        merged[key] = { ...createDefaultLfo(), ...persisted[key] }
      }
      appStore.set(lfosAtom, merged as Record<LfoSlotId, ReturnType<typeof createDefaultLfo>>)
    }

    const assignRaw = localStorage.getItem(KEYS.lfoAssignments)
    if (assignRaw) appStore.set(assignmentsAtom, JSON.parse(assignRaw))

    const assignStrRaw = localStorage.getItem(KEYS.lfoAssignmentStrengths)
    if (assignStrRaw) appStore.set(assignmentStrengthsAtom, JSON.parse(assignStrRaw))

    const assignDivRaw = localStorage.getItem(KEYS.lfoAssignmentDividers)
    if (assignDivRaw) appStore.set(assignmentDividersAtom, JSON.parse(assignDivRaw))

    const lfoParamModsRaw = localStorage.getItem(KEYS.lfoParamMods)
    if (lfoParamModsRaw) appStore.set(lfoParamModsAtom, JSON.parse(lfoParamModsRaw))

    const lfoParamBaseValuesRaw = localStorage.getItem(KEYS.lfoParamBaseValues)
    if (lfoParamBaseValuesRaw) appStore.set(lfoParamBaseValuesAtom, JSON.parse(lfoParamBaseValuesRaw))

    // Legacy LFO configs migration
    const lfoRaw = localStorage.getItem(KEYS.lfoConfigs)
    if (lfoRaw && !lfosRaw) {
      const oldConfigs = JSON.parse(lfoRaw)
      const assignments: Record<string, LfoSlotId | null> = {}
      for (const [paramName, cfg] of Object.entries(oldConfigs)) {
        const c = cfg as { enabled: boolean; period: number }
        if (c.enabled) assignments[paramName] = 'lfo1'
      }
      appStore.set(assignmentsAtom, assignments)
      appStore.set(lfoConfigsAtom, oldConfigs)
    }

    // Clock
    const clockRaw = localStorage.getItem(KEYS.clock)
    if (clockRaw) {
      const clock = JSON.parse(clockRaw)
      if (clock.bpm) appStore.set(bpmAtom, clock.bpm)
      if (clock.source) appStore.set(clockSourceAtom, clock.source)
    }

    // Param/option caches
    const paramCacheRaw = localStorage.getItem(KEYS.paramCache)
    if (paramCacheRaw) appStore.set(paramCacheAtom, JSON.parse(paramCacheRaw))
    const optionCacheRaw = localStorage.getItem(KEYS.optionCache)
    if (optionCacheRaw) appStore.set(optionCacheAtom, JSON.parse(optionCacheRaw))

    // Re-apply module with loaded caches (paramValues/optionValues come from cache)
    const restoredModuleId = localStorage.getItem(KEYS.module)
    if (restoredModuleId) appStore.set(setActiveModuleAtom, restoredModuleId)
  } catch {
    // ignore corrupt localStorage
  }
}

/** Flush mutable CC state into Jotai atoms (for persistence). */
export function flushCcToStore() {
  if (Object.keys(ccState.paramValues).length > 0) {
    const current = appStore.get(paramValuesAtom)
    const merged = { ...current, ...ccState.paramValues }
    appStore.set(paramValuesAtom, merged)

    const modId = appStore.get(activeModuleAtom)?.id
    if (modId) {
      appStore.set(paramCacheAtom, { ...appStore.get(paramCacheAtom), [modId]: merged })
    }
  }
  if (Object.keys(ccState.baseValues).length > 0) {
    appStore.set(baseValuesAtom, { ...appStore.get(baseValuesAtom), ...ccState.baseValues })
  }
  if (Object.keys(ccState.ccValues).length > 0) {
    appStore.set(ccValuesAtom, { ...ccState.ccValues })
  }
  // Clear accumulated CC state so next flush doesn't double-apply
  ccState.paramValues = {}
  ccState.baseValues = {}
}

export function saveAll() {
  const activeModule = appStore.get(activeModuleAtom)
  if (activeModule) localStorage.setItem(KEYS.module, activeModule.id)
  localStorage.setItem(KEYS.paramCache, JSON.stringify(appStore.get(paramCacheAtom)))
  localStorage.setItem(KEYS.optionCache, JSON.stringify(appStore.get(optionCacheAtom)))

  const selectedDeviceId = appStore.get(selectedDeviceIdAtom)
  if (selectedDeviceId) localStorage.setItem(KEYS.device, selectedDeviceId)
  localStorage.setItem(KEYS.mappings, JSON.stringify(appStore.get(mappingsAtom)))
  localStorage.setItem(KEYS.relativeFlags, JSON.stringify(appStore.get(relativeFlagsAtom)))

  localStorage.setItem(KEYS.lfos, JSON.stringify(appStore.get(lfosAtom)))
  localStorage.setItem(KEYS.lfoAssignments, JSON.stringify(appStore.get(assignmentsAtom)))
  localStorage.setItem(KEYS.lfoAssignmentStrengths, JSON.stringify(appStore.get(assignmentStrengthsAtom)))
  localStorage.setItem(KEYS.lfoAssignmentDividers, JSON.stringify(appStore.get(assignmentDividersAtom)))
  localStorage.setItem(KEYS.lfoConfigs, JSON.stringify(appStore.get(lfoConfigsAtom)))
  localStorage.setItem(KEYS.lfoParamMods, JSON.stringify(appStore.get(lfoParamModsAtom)))
  localStorage.setItem(KEYS.lfoParamBaseValues, JSON.stringify(appStore.get(lfoParamBaseValuesAtom)))

  const bpm = appStore.get(bpmAtom)
  const source = appStore.get(clockSourceAtom)
  localStorage.setItem(KEYS.clock, JSON.stringify({ bpm, source }))
}
