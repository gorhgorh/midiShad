import { create } from 'zustand'

export type UiScale = 'small' | 'normal' | 'big'

const STORAGE_KEY = 'midishad:uiScale'

function loadScale(): UiScale {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'small' || v === 'normal' || v === 'big') return v
  } catch { /* ignore */ }
  return 'normal'
}

interface UiState {
  scale: UiScale
  setScale: (s: UiScale) => void
}

export const useUiStore = create<UiState>((set) => ({
  scale: loadScale(),
  setScale: (s) => {
    localStorage.setItem(STORAGE_KEY, s)
    set({ scale: s })
  },
}))
