/**
 * Singleton rAF manager with configurable target FPS and frame budget skipping.
 *
 * Replaces scattered requestAnimationFrame calls with a single loop
 * that invokes registered callbacks. Supports target FPS so the
 * animation loop can skip frames when under budget.
 */

type TickCallback = (dt: number, elapsed: number) => void

class AnimationManager {
  private callbacks = new Map<string, TickCallback>()
  private rafId: number | null = null
  private lastTime = 0
  private _targetFps = 60
  private _frameBudget = 1000 / 60 // ms

  get targetFps() {
    return this._targetFps
  }

  set targetFps(fps: number) {
    this._targetFps = Math.max(1, Math.min(144, fps))
    this._frameBudget = 1000 / this._targetFps
  }

  /** Register a named callback. Starts the loop if not running. */
  register(id: string, cb: TickCallback) {
    this.callbacks.set(id, cb)
    if (this.rafId === null) this.start()
  }

  /** Unregister a callback. Stops the loop if no callbacks remain. */
  unregister(id: string) {
    this.callbacks.delete(id)
    if (this.callbacks.size === 0) this.stop()
  }

  private start() {
    this.lastTime = performance.now()
    const tick = (now: number) => {
      this.rafId = requestAnimationFrame(tick)
      const dt = now - this.lastTime

      // Skip frame if significantly under budget (throttle to target FPS)
      // Use 90% of budget to account for browser timing jitter
      if (dt < this._frameBudget * 0.9) return

      this.lastTime = now
      const elapsed = now / 1000

      for (const cb of this.callbacks.values()) {
        cb(dt, elapsed)
      }
    }
    this.rafId = requestAnimationFrame(tick)
  }

  private stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }
}

export const animationManager = new AnimationManager()
