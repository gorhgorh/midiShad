import { useCallback, useSyncExternalStore } from 'react'
import { renderState } from './renderState'

/**
 * Low-frequency (~10fps) hook for reading modulated param values from renderState.
 * Uses useSyncExternalStore with a polling snapshot so the UI updates at a
 * comfortable rate without triggering re-renders on every animation frame.
 */

const POLL_INTERVAL = 100 // ms (~10fps)

// Shared polling subscription — all instances share one setInterval
let pollTimer: ReturnType<typeof setInterval> | null = null
const pollListeners = new Set<() => void>()
let snapshotVersion = 0

function startPolling() {
  if (pollTimer !== null) return
  pollTimer = setInterval(() => {
    if (renderState.version !== snapshotVersion) {
      snapshotVersion = renderState.version
      for (const listener of pollListeners) listener()
    }
  }, POLL_INTERVAL)
}

function stopPolling() {
  if (pollTimer !== null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function subscribePoll(listener: () => void) {
  pollListeners.add(listener)
  startPolling()
  return () => {
    pollListeners.delete(listener)
    if (pollListeners.size === 0) stopPolling()
  }
}

/**
 * Read a single modulated param value from renderState.
 * Re-renders at ~10fps when the value changes.
 * Returns `fallback` if no modulated value exists (e.g. no LFO assigned).
 */
export function useModulatedParam(paramName: string, fallback: number): number {
  const getSnapshot = useCallback(
    () => renderState.modulatedParams[paramName] ?? fallback,
    [paramName, fallback],
  )
  return useSyncExternalStore(subscribePoll, getSnapshot, getSnapshot)
}

/**
 * Read a modulated option value from renderState.
 */
export function useModulatedOption(optionName: string, fallback: unknown): unknown {
  const getSnapshot = useCallback(
    () => renderState.modulatedOptions[optionName] ?? fallback,
    [optionName, fallback],
  )
  return useSyncExternalStore(subscribePoll, getSnapshot, getSnapshot)
}

/**
 * Check whether renderState has any modulated value for a given param.
 * Useful for deciding whether to show the modulated value indicator.
 */
export function useHasModulation(paramName: string): boolean {
  const getSnapshot = useCallback(
    () => paramName in renderState.modulatedParams,
    [paramName],
  )
  return useSyncExternalStore(subscribePoll, getSnapshot, getSnapshot)
}
