import { atom } from 'jotai'
import type { ModuleDefinition } from '../types'
import { ccState } from '../render/ccState'

type ParamCache = Record<string, Record<string, number>>
type OptionCache = Record<string, Record<string, unknown>>

// --- Primitive atoms ---
export const modulesAtom = atom<ModuleDefinition[]>([])
export const activeModuleAtom = atom<ModuleDefinition | null>(null)
export const paramValuesAtom = atom<Record<string, number>>({})
export const optionValuesAtom = atom<Record<string, unknown>>({})
export const paramCacheAtom = atom<ParamCache>({})
export const optionCacheAtom = atom<OptionCache>({})
export const callActionAtom = atom<((methodName: string) => void) | null>(null)

// --- Helpers ---
function defaultParams(mod: ModuleDefinition): Record<string, number> {
  const out: Record<string, number> = {}
  for (const p of mod.params) out[p.name] = p.default
  return out
}

function defaultOptions(mod: ModuleDefinition): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const o of mod.options) out[o.name] = o.defaultVal
  return out
}

// --- Write atoms (actions) ---
export const setModulesAtom = atom(
  null,
  (get, set, modules: ModuleDefinition[]) => {
    const current = get(activeModuleAtom)
    const active = current && modules.find((m) => m.id === current.id)
      ? modules.find((m) => m.id === current.id)!
      : modules[0] ?? null

    set(modulesAtom, modules)
    set(activeModuleAtom, active)
    set(paramValuesAtom, active ? (get(paramCacheAtom)[active.id] ?? defaultParams(active)) : {})
    set(optionValuesAtom, active ? (get(optionCacheAtom)[active.id] ?? defaultOptions(active)) : {})
  },
)

export const setActiveModuleAtom = atom(
  null,
  (get, set, id: string) => {
    const modules = get(modulesAtom)
    const mod = modules.find((m) => m.id === id)
    if (!mod) return

    const activeModule = get(activeModuleAtom)
    // Merge any CC-updated params before caching old module's values
    const rawParamValues = get(paramValuesAtom)
    const paramValues = Object.keys(ccState.paramValues).length > 0
      ? { ...rawParamValues, ...ccState.paramValues }
      : rawParamValues
    const optionValues = get(optionValuesAtom)
    const paramCache = get(paramCacheAtom)
    const optionCache = get(optionCacheAtom)

    // Save current values before switching
    const updatedParamCache = activeModule
      ? { ...paramCache, [activeModule.id]: paramValues }
      : paramCache
    const updatedOptionCache = activeModule
      ? { ...optionCache, [activeModule.id]: optionValues }
      : optionCache

    // Restore cached or defaults
    const restoredParams = updatedParamCache[id] ?? defaultParams(mod)
    const restoredOptions = updatedOptionCache[id] ?? defaultOptions(mod)

    set(activeModuleAtom, mod)
    set(paramValuesAtom, restoredParams)
    set(optionValuesAtom, restoredOptions)
    set(paramCacheAtom, updatedParamCache)
    set(optionCacheAtom, updatedOptionCache)

    // Clear CC accumulation for new module
    ccState.paramValues = {}
    ccState.baseValues = {}
  },
)

export const setParamValueAtom = atom(
  null,
  (get, set, { name, value }: { name: string; value: number }) => {
    const paramValues = get(paramValuesAtom)
    const newParams = { ...paramValues, [name]: value }
    set(paramValuesAtom, newParams)

    const modId = get(activeModuleAtom)?.id
    if (modId) {
      set(paramCacheAtom, { ...get(paramCacheAtom), [modId]: newParams })
    }
  },
)

// Batch version for performance - set multiple params in one update
export const setParamValuesBatchAtom = atom(
  null,
  (get, set, updates: Record<string, number>) => {
    if (Object.keys(updates).length === 0) return
    const paramValues = get(paramValuesAtom)
    const newParams = { ...paramValues, ...updates }
    set(paramValuesAtom, newParams)

    const modId = get(activeModuleAtom)?.id
    if (modId) {
      set(paramCacheAtom, { ...get(paramCacheAtom), [modId]: newParams })
    }
  },
)

export const setOptionValueAtom = atom(
  null,
  (get, set, { name, value }: { name: string; value: unknown }) => {
    const optionValues = get(optionValuesAtom)
    const newOpts = { ...optionValues, [name]: value }
    set(optionValuesAtom, newOpts)

    const modId = get(activeModuleAtom)?.id
    if (modId) {
      set(optionCacheAtom, { ...get(optionCacheAtom), [modId]: newOpts })
    }
  },
)

export const resetModuleParamsAtom = atom(
  null,
  (get, set) => {
    const activeModule = get(activeModuleAtom)
    if (!activeModule) return
    const params = defaultParams(activeModule)
    const options = defaultOptions(activeModule)

    set(paramValuesAtom, params)
    set(optionValuesAtom, options)
    set(paramCacheAtom, { ...get(paramCacheAtom), [activeModule.id]: params })
    set(optionCacheAtom, { ...get(optionCacheAtom), [activeModule.id]: options })
  },
)
