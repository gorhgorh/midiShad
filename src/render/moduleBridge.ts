/**
 * Module bridge — allows MIDI hooks to call module methods
 * directly without going through Jotai atoms.
 */

type BridgeFn = (paramUpdates: Record<string, number>, baseUpdates: Record<string, number>) => void

let _bridgeFn: BridgeFn | null = null

export function registerBridge(fn: BridgeFn) {
  _bridgeFn = fn
}

export function unregisterBridge() {
  _bridgeFn = null
}

export function callBridge(paramUpdates: Record<string, number>, baseUpdates: Record<string, number>) {
  _bridgeFn?.(paramUpdates, baseUpdates)
}
