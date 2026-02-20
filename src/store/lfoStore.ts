import { create } from 'zustand'
import { type LfoDefinition, type LfoParamName, createDefaultLfo } from '../lfo/engine'
import { type LfoParamModSource, wouldCreateCycle } from '../lfo/graph'

export type LfoSlotId = 'lfo1' | 'lfo2' | 'lfo3' | 'lfo4'
export const LFO_SLOT_IDS: LfoSlotId[] = ['lfo1', 'lfo2', 'lfo3', 'lfo4']

interface LfoState {
  lfos: Record<LfoSlotId, LfoDefinition>
  /** paramName → lfoSlotId or null */
  assignments: Record<string, LfoSlotId | null>
  /** Per-assignment strength (0-1), keyed by param name */
  assignmentStrengths: Record<string, number>
  /** Per-assignment divider multiplier, keyed by param name (default 1) */
  assignmentDividers: Record<string, number>
  /** Base values (what the user set via slider) per param, separate from LFO-modulated display values */
  baseValues: Record<string, number>

  /** LFO-to-LFO and CC modulation routing. Keys: "lfo1.strength", "lfo2.drive", etc. */
  lfoParamMods: Record<string, LfoParamModSource | null>
  /** Base values for LFO params when modulated. Keys same as lfoParamMods. */
  lfoParamBaseValues: Record<string, number>
  /** CC learn target for LFO params (separate from module param learn) */
  lfoLearnTarget: string | null

  /** Latest CC values from MIDI, keyed by CC number */
  ccValues: Record<number, number>

  setLfo: (id: LfoSlotId, partial: Partial<LfoDefinition>) => void
  assignParam: (paramName: string, lfoId: LfoSlotId | null) => void
  setBaseValue: (paramName: string, value: number) => void
  setAssignmentStrength: (paramName: string, value: number) => void
  setAssignmentDivider: (paramName: string, value: number) => void

  /** Set modulation source for an LFO parameter. Returns false if it would create a cycle. */
  setLfoParamMod: (lfoId: LfoSlotId, param: LfoParamName, source: LfoParamModSource | null) => boolean
  setLfoParamBaseValue: (lfoId: LfoSlotId, param: LfoParamName, value: number) => void
  setLfoLearnTarget: (target: string | null) => void
  setCcValue: (ccNumber: number, value: number) => void
  resetLfo: (id: LfoSlotId) => void
  resetAllLfos: () => void

  // Legacy compat
  configs: Record<string, { enabled: boolean; period: number }>
  toggleLfo: (paramName: string) => void
  setLfoPeriod: (paramName: string, period: number) => void
}

export const useLfoStore = create<LfoState>((set, get) => ({
  lfos: {
    lfo1: createDefaultLfo(),
    lfo2: createDefaultLfo(),
    lfo3: createDefaultLfo(),
    lfo4: createDefaultLfo(),
  },
  assignments: {},
  assignmentStrengths: {},
  assignmentDividers: {},
  baseValues: {},
  lfoParamMods: {},
  lfoParamBaseValues: {},
  lfoLearnTarget: null,
  ccValues: {},
  setLfo: (id, partial) =>
    set((s) => ({
      lfos: { ...s.lfos, [id]: { ...s.lfos[id], ...partial } },
    })),

  assignParam: (paramName, lfoId) =>
    set((s) => ({
      assignments: { ...s.assignments, [paramName]: lfoId },
    })),

  setBaseValue: (paramName, value) =>
    set((s) => ({
      baseValues: { ...s.baseValues, [paramName]: value },
    })),

  setAssignmentStrength: (paramName, value) =>
    set((s) => ({
      assignmentStrengths: { ...s.assignmentStrengths, [paramName]: value },
    })),

  setAssignmentDivider: (paramName, value) =>
    set((s) => ({
      assignmentDividers: { ...s.assignmentDividers, [paramName]: value },
    })),

  setLfoParamMod: (lfoId, param, source) => {
    const state = get()
    // Validate no cycles for LFO sources
    if (source && source.type === 'lfo' && source.lfoId) {
      if (wouldCreateCycle(state.lfoParamMods, lfoId, source.lfoId)) {
        return false
      }
    }
    const key = `${lfoId}.${param}`
    set((s) => ({
      lfoParamMods: { ...s.lfoParamMods, [key]: source },
    }))
    return true
  },

  setLfoParamBaseValue: (lfoId, param, value) => {
    const key = `${lfoId}.${param}`
    set((s) => ({
      lfoParamBaseValues: { ...s.lfoParamBaseValues, [key]: value },
    }))
  },

  setLfoLearnTarget: (target) => set({ lfoLearnTarget: target }),

  setCcValue: (ccNumber, value) =>
    set((s) => ({
      ccValues: { ...s.ccValues, [ccNumber]: value },
    })),

  resetLfo: (id) =>
    set((s) => {
      const lfoParamMods = { ...s.lfoParamMods }
      const lfoParamBaseValues = { ...s.lfoParamBaseValues }
      for (const key of Object.keys(lfoParamMods)) {
        if (key.startsWith(`${id}.`)) {
          delete lfoParamMods[key]
          delete lfoParamBaseValues[key]
        }
      }
      return {
        lfos: { ...s.lfos, [id]: createDefaultLfo() },
        lfoParamMods,
        lfoParamBaseValues,
      }
    }),

  resetAllLfos: () =>
    set({
      lfos: {
        lfo1: createDefaultLfo(),
        lfo2: createDefaultLfo(),
        lfo3: createDefaultLfo(),
        lfo4: createDefaultLfo(),
      },
      assignments: {},
      assignmentStrengths: {},
      assignmentDividers: {},
      baseValues: {},
      lfoParamMods: {},
      lfoParamBaseValues: {},
      lfoLearnTarget: null,
    }),

  // Legacy compat layer
  configs: {},
  toggleLfo: (paramName) =>
    set((s) => {
      const existing = s.configs[paramName]
      const newEnabled = !existing?.enabled
      return {
        configs: {
          ...s.configs,
          [paramName]: {
            enabled: newEnabled,
            period: existing?.period ?? 4,
          },
        },
        assignments: {
          ...s.assignments,
          [paramName]: newEnabled ? 'lfo1' : null,
        },
      }
    }),

  setLfoPeriod: (paramName, period) =>
    set((s) => ({
      configs: {
        ...s.configs,
        [paramName]: {
          enabled: s.configs[paramName]?.enabled ?? false,
          period,
        },
      },
    })),
}))
