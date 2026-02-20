import { create } from 'zustand'
import type { ModuleDefinition } from '../types'

type ParamCache = Record<string, Record<string, number>>
type OptionCache = Record<string, Record<string, unknown>>

interface ModuleState {
  modules: ModuleDefinition[]
  activeModule: ModuleDefinition | null
  paramValues: Record<string, number>
  optionValues: Record<string, unknown>
  paramCache: ParamCache
  optionCache: OptionCache
  /** Callback set by ModuleRenderer to invoke action methods on the live instance */
  callAction: ((methodName: string) => void) | null

  setModules: (modules: ModuleDefinition[]) => void
  setActiveModule: (id: string) => void
  setParamValue: (name: string, value: number) => void
  setOptionValue: (name: string, value: unknown) => void
  setCallAction: (fn: ((methodName: string) => void) | null) => void
}

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

export const useModuleStore = create<ModuleState>((set, get) => ({
  modules: [],
  activeModule: null,
  paramValues: {},
  optionValues: {},
  paramCache: {},
  optionCache: {},
  callAction: null,

  setModules: (modules) => {
    const current = get().activeModule
    // If current module still exists, keep it; otherwise pick first
    const active = current && modules.find((m) => m.id === current.id)
      ? modules.find((m) => m.id === current.id)!
      : modules[0] ?? null
    set({
      modules,
      activeModule: active,
      paramValues: active ? (get().paramCache[active.id] ?? defaultParams(active)) : {},
      optionValues: active ? (get().optionCache[active.id] ?? defaultOptions(active)) : {},
    })
  },

  setActiveModule: (id) => {
    const mod = get().modules.find((m) => m.id === id)
    if (!mod) return
    const { activeModule, paramValues, optionValues, paramCache, optionCache } = get()
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
    set({
      activeModule: mod,
      paramValues: restoredParams,
      optionValues: restoredOptions,
      paramCache: updatedParamCache,
      optionCache: updatedOptionCache,
    })
  },

  setParamValue: (name, value) =>
    set((s) => {
      const newParams = { ...s.paramValues, [name]: value }
      const modId = s.activeModule?.id
      return {
        paramValues: newParams,
        paramCache: modId ? { ...s.paramCache, [modId]: newParams } : s.paramCache,
      }
    }),

  setOptionValue: (name, value) =>
    set((s) => {
      const newOpts = { ...s.optionValues, [name]: value }
      const modId = s.activeModule?.id
      return {
        optionValues: newOpts,
        optionCache: modId ? { ...s.optionCache, [modId]: newOpts } : s.optionCache,
      }
    }),

  setCallAction: (fn) => set({ callAction: fn }),
}))
