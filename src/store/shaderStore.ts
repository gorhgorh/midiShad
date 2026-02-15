import { create } from 'zustand'
import { shaders } from '../shaders/registry'
import type { ShaderDefinition } from '../shaders/types'

// Cache of param values per shader id — survives shader switches
type ParamCache = Record<string, Record<string, number>>

interface ShaderState {
  activeShader: ShaderDefinition
  paramValues: Record<string, number>
  paramCache: ParamCache
  setActiveShader: (id: string) => void
  setParamValue: (name: string, value: number) => void
}

function defaultParams(shader: ShaderDefinition): Record<string, number> {
  const out: Record<string, number> = {}
  for (const p of shader.params) {
    out[p.name] = p.default
  }
  return out
}

export const useShaderStore = create<ShaderState>((set, get) => ({
  activeShader: shaders[0],
  paramValues: defaultParams(shaders[0]),
  paramCache: {},

  setActiveShader: (id) => {
    const shader = shaders.find((s) => s.id === id)
    if (!shader) return
    const { activeShader, paramValues, paramCache } = get()
    // Save current values before switching
    const updatedCache = { ...paramCache, [activeShader.id]: paramValues }
    // Restore cached values or use defaults
    const restored = updatedCache[id] ?? defaultParams(shader)
    set({ activeShader: shader, paramValues: restored, paramCache: updatedCache })
  },

  setParamValue: (name, value) =>
    set((s) => ({ paramValues: { ...s.paramValues, [name]: value } })),
}))
