import { create } from 'zustand'
import { type LfoDefinition, createDefaultLfo } from '../lfo/engine'

export type LfoSlotId = 'lfo1' | 'lfo2' | 'lfo3' | 'lfo4'
export const LFO_SLOT_IDS: LfoSlotId[] = ['lfo1', 'lfo2', 'lfo3', 'lfo4']

interface LfoState {
  lfos: Record<LfoSlotId, LfoDefinition>
  /** paramName → lfoSlotId or null */
  assignments: Record<string, LfoSlotId | null>
  /** Base values (what the user set via slider) per param, separate from LFO-modulated display values */
  baseValues: Record<string, number>

  setLfo: (id: LfoSlotId, partial: Partial<LfoDefinition>) => void
  assignParam: (paramName: string, lfoId: LfoSlotId | null) => void
  setBaseValue: (paramName: string, value: number) => void

  // Legacy compat — these are used by old LFO toggle in ParamRow
  // Will be removed when Phase 5 replaces the UI
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
  baseValues: {},

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

  // Legacy compat layer — maps old configs to new LFO1 assignments
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
        // Also update new assignment system: toggle assigns/unassigns lfo1
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
