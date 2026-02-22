import { atom } from 'jotai'
import { type LfoDefinition, type LfoParamName, type LfoParamModSource, createDefaultLfo, wouldCreateCycle } from '@almst/lfo'

export type LfoSlotId = 'lfo1' | 'lfo2' | 'lfo3' | 'lfo4'
export const LFO_SLOT_IDS: LfoSlotId[] = ['lfo1', 'lfo2', 'lfo3', 'lfo4']

// --- Primitive atoms ---
export const lfosAtom = atom<Record<LfoSlotId, LfoDefinition>>({
  lfo1: createDefaultLfo(),
  lfo2: createDefaultLfo(),
  lfo3: createDefaultLfo(),
  lfo4: createDefaultLfo(),
})

/** paramName → lfoSlotId or null */
export const assignmentsAtom = atom<Record<string, LfoSlotId | null>>({})

/** Per-assignment strength (0-1), keyed by param name */
export const assignmentStrengthsAtom = atom<Record<string, number>>({})

/** Per-assignment divider multiplier, keyed by param name (default 1) */
export const assignmentDividersAtom = atom<Record<string, number>>({})

/** Base values (what the user set via slider) per param */
export const baseValuesAtom = atom<Record<string, number>>({})

/** LFO-to-LFO and CC modulation routing. Keys: "lfo1.strength", "lfo2.drive", etc. */
export const lfoParamModsAtom = atom<Record<string, LfoParamModSource | null>>({})

/** Base values for LFO params when modulated */
export const lfoParamBaseValuesAtom = atom<Record<string, number>>({})

/** CC learn target for LFO params */
export const lfoLearnTargetAtom = atom<string | null>(null)

/** Latest CC values from MIDI, keyed by CC number */
export const ccValuesAtom = atom<Record<number, number>>({})

/** Set of CC numbers that have been seen (rarely changes - only on new CCs) */
export const seenCcsAtom = atom<number[]>([])

/** Legacy compat */
export const lfoConfigsAtom = atom<Record<string, { enabled: boolean; period: number }>>({})

// --- Write atoms (actions) ---
export const setLfoAtom = atom(
  null,
  (get, set, { id, partial }: { id: LfoSlotId; partial: Partial<LfoDefinition> }) => {
    const lfos = get(lfosAtom)
    set(lfosAtom, { ...lfos, [id]: { ...lfos[id], ...partial } })
  },
)

export const assignParamAtom = atom(
  null,
  (get, set, { paramName, lfoId }: { paramName: string; lfoId: LfoSlotId | null }) => {
    set(assignmentsAtom, { ...get(assignmentsAtom), [paramName]: lfoId })
  },
)

export const setBaseValueAtom = atom(
  null,
  (get, set, { paramName, value }: { paramName: string; value: number }) => {
    set(baseValuesAtom, { ...get(baseValuesAtom), [paramName]: value })
  },
)

export const setAssignmentStrengthAtom = atom(
  null,
  (get, set, { paramName, value }: { paramName: string; value: number }) => {
    set(assignmentStrengthsAtom, { ...get(assignmentStrengthsAtom), [paramName]: value })
  },
)

export const setAssignmentDividerAtom = atom(
  null,
  (get, set, { paramName, value }: { paramName: string; value: number }) => {
    set(assignmentDividersAtom, { ...get(assignmentDividersAtom), [paramName]: value })
  },
)

/** Set modulation source for an LFO parameter. Returns false if it would create a cycle. */
export const setLfoParamModAtom = atom(
  null,
  (get, set, { lfoId, param, source }: { lfoId: LfoSlotId; param: LfoParamName; source: LfoParamModSource | null }): boolean => {
    if (source && source.type === 'lfo' && source.lfoId) {
      if (wouldCreateCycle(get(lfoParamModsAtom), lfoId, source.lfoId)) {
        return false
      }
    }
    const key = `${lfoId}.${param}`
    set(lfoParamModsAtom, { ...get(lfoParamModsAtom), [key]: source })
    return true
  },
)

export const setLfoParamBaseValueAtom = atom(
  null,
  (get, set, { lfoId, param, value }: { lfoId: LfoSlotId; param: LfoParamName; value: number }) => {
    const key = `${lfoId}.${param}`
    set(lfoParamBaseValuesAtom, { ...get(lfoParamBaseValuesAtom), [key]: value })
  },
)

export const setCcValueAtom = atom(
  null,
  (get, set, { ccNumber, value }: { ccNumber: number; value: number }) => {
    set(ccValuesAtom, { ...get(ccValuesAtom), [ccNumber]: value })
  },
)

export const resetLfoAtom = atom(
  null,
  (get, set, id: LfoSlotId) => {
    const lfoParamMods = { ...get(lfoParamModsAtom) }
    const lfoParamBaseValues = { ...get(lfoParamBaseValuesAtom) }
    for (const key of Object.keys(lfoParamMods)) {
      if (key.startsWith(`${id}.`)) {
        delete lfoParamMods[key]
        delete lfoParamBaseValues[key]
      }
    }
    set(lfosAtom, { ...get(lfosAtom), [id]: createDefaultLfo() })
    set(lfoParamModsAtom, lfoParamMods)
    set(lfoParamBaseValuesAtom, lfoParamBaseValues)
  },
)

export const resetAllLfosAtom = atom(
  null,
  (_get, set) => {
    set(lfosAtom, {
      lfo1: createDefaultLfo(),
      lfo2: createDefaultLfo(),
      lfo3: createDefaultLfo(),
      lfo4: createDefaultLfo(),
    })
    set(assignmentsAtom, {})
    set(assignmentStrengthsAtom, {})
    set(assignmentDividersAtom, {})
    set(baseValuesAtom, {})
    set(lfoParamModsAtom, {})
    set(lfoParamBaseValuesAtom, {})
    set(lfoLearnTargetAtom, null)
  },
)

// Legacy compat
export const toggleLfoAtom = atom(
  null,
  (get, set, paramName: string) => {
    const configs = get(lfoConfigsAtom)
    const existing = configs[paramName]
    const newEnabled = !existing?.enabled
    set(lfoConfigsAtom, {
      ...configs,
      [paramName]: { enabled: newEnabled, period: existing?.period ?? 4 },
    })
    set(assignmentsAtom, {
      ...get(assignmentsAtom),
      [paramName]: newEnabled ? 'lfo1' : null,
    })
  },
)
