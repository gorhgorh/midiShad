import { atom } from 'jotai'

export type ClockSource = 'manual' | 'midi'

export const bpmAtom = atom(120)
export const clockSourceAtom = atom<ClockSource>('manual')
