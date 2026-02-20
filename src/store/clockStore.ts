import { create } from 'zustand'

export type ClockSource = 'manual' | 'midi'

interface ClockState {
  bpm: number
  source: ClockSource
  setBpm: (bpm: number) => void
  setSource: (source: ClockSource) => void
}

export const useClockStore = create<ClockState>((set) => ({
  bpm: 120,
  source: 'manual',
  setBpm: (bpm) => set({ bpm }),
  setSource: (source) => set({ source }),
}))
