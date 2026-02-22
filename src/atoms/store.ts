import { createStore } from 'jotai'

/**
 * Shared Jotai store — used for imperative access in rAF loops,
 * event handlers, and persistence (outside React).
 */
export const appStore = createStore()
