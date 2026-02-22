import { atom } from 'jotai'

export type UiScale = 'small' | 'normal' | 'big'

const STORAGE_KEY = 'midishad:uiScale'

function loadScale(): UiScale {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'small' || v === 'normal' || v === 'big') return v
  } catch { /* ignore */ }
  return 'normal'
}

const _scaleAtom = atom<UiScale>(loadScale())

/** Read/write atom that persists to localStorage on set */
export const scaleAtom = atom(
  (get) => get(_scaleAtom),
  (_get, set, value: UiScale) => {
    localStorage.setItem(STORAGE_KEY, value)
    set(_scaleAtom, value)
  },
)
