/**
 * Mutable render state — written by the LFO/animation loop at 60fps,
 * read by the UI at ~10fps via useModulatedValue.
 *
 * This is intentionally NOT reactive (no Zustand, no signals).
 * The animation loop writes here and calls module methods directly,
 * completely bypassing the store hot path.
 */

export interface RenderState {
  /** Current modulated param values (LFO-applied). Keyed by param name. */
  modulatedParams: Record<string, number>
  /** Current modulated option values (e.g. boolean toggles). Keyed by option name. */
  modulatedOptions: Record<string, unknown>
  /** Monotonic version counter — bumped every time the animation loop writes. */
  version: number
}

export const renderState: RenderState = {
  modulatedParams: {},
  modulatedOptions: {},
  version: 0,
}

/** Bump version after writing — used by useSyncExternalStore subscribers. */
export function bumpVersion() {
  renderState.version++
}

/** Reset render state (e.g. on module switch). */
export function resetRenderState() {
  renderState.modulatedParams = {}
  renderState.modulatedOptions = {}
  renderState.version++
}
