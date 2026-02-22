/**
 * Mutable CC state — written by MIDI hooks at 30Hz,
 * read by bridge/CcMonitor/LFO tick.
 *
 * Bypasses Jotai for zero-allocation hot path.
 * Flushed to Jotai atoms only on save/module-switch/unload.
 */

export const ccState = {
  /** Raw CC values, keyed by CC number. Mutated in place. */
  ccValues: {} as Record<number, number>,
  /** Accumulated param values from CC changes. Cleared on flush. */
  paramValues: {} as Record<string, number>,
  /** Accumulated base values from CC changes. Cleared on flush. */
  baseValues: {} as Record<string, number>,
}

/** Callback for CC learn-mode detection (CcMonitor). */
type CcChangeCallback = (cc: number, value: number) => void
let _ccChangeCallback: CcChangeCallback | null = null

export function onCcChange(cb: CcChangeCallback | null) {
  _ccChangeCallback = cb
}

/** Called by MIDI hooks after mutating ccValues. */
export function notifyCcChange(cc: number, value: number) {
  _ccChangeCallback?.(cc, value)
}
