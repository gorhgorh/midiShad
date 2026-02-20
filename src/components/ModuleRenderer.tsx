import { useEffect, useRef } from 'react'
import { useModuleStore } from '../store/moduleStore'
import { useLfoStore } from '../store/lfoStore'
import { useClockStore } from '../store/clockStore'
import { computeLfosInOrder } from '../lfo/graph'
import type { ModuleInstance, ModuleDefinition } from '../types'

/** Maps base_* param names to the arg name the base method expects */
const BASE_ARG_MAP: Record<string, string> = {
  base_offsetX: 'x',
  base_offsetY: 'y',
  base_scale: 'scale',
  base_opacity: 'opacity',
  base_rotate: 'degrees',
}

function callMethod(instance: ModuleInstance, methodName: string, args: Record<string, unknown>, moduleClass?: ModuleDefinition['moduleClass']) {
  // nw_wrld modules often shadow prototype methods with instance properties
  // of the same name (e.g. this.color = "#fff" shadows color({color}){…}).
  // Look up the method on the class prototype first to bypass shadowing.
  let fn: unknown
  if (moduleClass) {
    fn = moduleClass.prototype[methodName]
  }
  if (typeof fn !== 'function') {
    fn = instance[methodName]
  }
  if (typeof fn === 'function') {
    (fn as (a: Record<string, unknown>) => void).call(instance, args)
  }
}

/** Remap base_* param names to the arg names base methods expect */
function remapBaseArgs(args: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(args)) {
    const mapped = BASE_ARG_MAP[key]
    out[mapped ?? key] = val
  }
  return out
}

export function ModuleRenderer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<ModuleInstance | null>(null)
  const activeModRef = useRef<ModuleDefinition | null>(null)
  const rafRef = useRef<number | null>(null)
  const visibleRef = useRef(true)

  // Mount / swap module instances + react to all store changes
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let prevModuleId: string | null = null
    let prevParamValues: Record<string, number> = {}
    let prevOptionValues: Record<string, unknown> = {}

    function instantiate(activeModule: ModuleDefinition) {
      if (!container) return
      // Destroy previous
      if (instanceRef.current) {
        instanceRef.current.destroy()
        instanceRef.current = null
      }
      activeModRef.current = activeModule
      visibleRef.current = true

      try {
        const instance = new activeModule.moduleClass(container) as ModuleInstance
        instanceRef.current = instance

        // Execute executeOnLoad methods with current values
        const { paramValues, optionValues } = useModuleStore.getState()
        for (const eol of activeModule.executeOnLoadMethods) {
          const args: Record<string, unknown> = { ...eol.defaults }
          for (const key of Object.keys(args)) {
            if (key in paramValues) args[key] = paramValues[key]
            if (key in optionValues) args[key] = optionValues[key]
          }
          callMethod(instance, eol.name, args, activeModule.moduleClass)
        }
      } catch (err) {
        console.error('[ModuleRenderer] Failed to instantiate module:', err)
      }

      // Expose action caller so UI buttons can invoke methods on the live instance
      useModuleStore.getState().setCallAction((methodName: string) => {
        const inst = instanceRef.current
        const mod = activeModRef.current
        if (!inst || !mod) return

        // Handle visibility toggle
        if (methodName === 'base_toggleVisibility') {
          visibleRef.current = !visibleRef.current
          if (visibleRef.current) inst.show()
          else inst.hide()
          return
        }

        callMethod(inst, methodName, {}, mod.moduleClass)
      })
    }

    // Fire immediately with current state
    const initialState = useModuleStore.getState()
    if (initialState.activeModule) {
      prevModuleId = initialState.activeModule.id
      prevParamValues = initialState.paramValues
      prevOptionValues = initialState.optionValues
      instantiate(initialState.activeModule)
    }

    const unsub = useModuleStore.subscribe((state) => {
      const instance = instanceRef.current
      const activeModule = state.activeModule

      // Module changed?
      const moduleId = activeModule?.id ?? null
      if (moduleId !== prevModuleId) {
        prevModuleId = moduleId
        prevParamValues = state.paramValues
        prevOptionValues = state.optionValues
        if (activeModule) {
          instantiate(activeModule)
        } else {
          if (instanceRef.current) {
            instanceRef.current.destroy()
            instanceRef.current = null
          }
          activeModRef.current = null
        }
        return
      }

      if (!instance || !activeModule) return

      // Param values changed? Batch by methodName so methods that accept
      // multiple params (e.g. size({x, y})) get all values in one call.
      if (state.paramValues !== prevParamValues) {
        prevParamValues = state.paramValues
        const batched: Record<string, Record<string, unknown>> = {}
        for (const param of activeModule.params) {
          if (param.name in state.paramValues) {
            const key = param.methodName
            if (!batched[key]) batched[key] = {}
            batched[key][param.name] = state.paramValues[param.name]
          }
        }
        for (const [method, args] of Object.entries(batched)) {
          // Base methods need arg remapping (base_offsetX → x, etc.)
          const isBase = Object.keys(args).some((k) => k in BASE_ARG_MAP)
          const remapped = isBase ? remapBaseArgs(args) : args
          callMethod(instance, method, remapped, activeModule.moduleClass)
        }
      }

      // Option values changed? Batch by methodName
      if (state.optionValues !== prevOptionValues) {
        prevOptionValues = state.optionValues
        const batched: Record<string, Record<string, unknown>> = {}
        for (const opt of activeModule.options) {
          if (opt.name in state.optionValues) {
            const key = opt.methodName
            if (!batched[key]) batched[key] = {}
            batched[key][opt.name] = state.optionValues[opt.name]
          }
        }
        for (const [method, args] of Object.entries(batched)) {
          callMethod(instance, method, args, activeModule.moduleClass)
        }
      }
    })

    return () => {
      unsub()
      useModuleStore.getState().setCallAction(null)
      if (instanceRef.current) {
        instanceRef.current.destroy()
        instanceRef.current = null
      }
    }
  }, [])

  // LFO animation loop
  useEffect(() => {
    function tick() {
      rafRef.current = requestAnimationFrame(tick)
      const instance = instanceRef.current
      const activeModule = activeModRef.current
      if (!instance || !activeModule) return

      const { lfos, assignments, baseValues, lfoParamMods, lfoParamBaseValues, ccValues } = useLfoStore.getState()
      const { bpm } = useClockStore.getState()
      const elapsed = performance.now() / 1000

      // Pre-compute all 4 LFO outputs in dependency order
      const lfoOutputs = computeLfosInOrder(lfos, lfoParamMods, lfoParamBaseValues, bpm, elapsed, ccValues)

      for (const param of activeModule.params) {
        const lfoId = assignments[param.name]
        if (!lfoId) continue

        const lfo = lfos[lfoId]
        if (!lfo) continue

        const lfoOutput = lfoOutputs[lfoId]
        const base = baseValues[param.name] ?? param.default
        const range = param.max - param.min

        let val: number
        if (lfo.bipolar) {
          val = base + lfoOutput * range
        } else {
          val = param.min + lfoOutput * range
        }

        val = Math.max(param.min, Math.min(param.max, val))
        useModuleStore.getState().setParamValue(param.name, val)
      }

      // Boolean options: LFO toggles with 10%/90% threshold
      for (const opt of activeModule.options) {
        if (opt.type !== 'boolean') continue
        const lfoId = assignments[opt.name]
        if (!lfoId) continue

        const lfo = lfos[lfoId]
        if (!lfo) continue

        const lfoOutput = lfoOutputs[lfoId]
        const s = lfo.strength || 1
        const normalized = lfo.bipolar
          ? (lfoOutput / s + 1) / 2
          : lfoOutput / s
        const current = useModuleStore.getState().optionValues[opt.name]
        if (normalized < 0.1 && current !== false) {
          useModuleStore.getState().setOptionValue(opt.name, false)
        } else if (normalized > 0.9 && current !== true) {
          useModuleStore.getState().setOptionValue(opt.name, true)
        }
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="module-container fixed inset-0 w-screen h-screen z-0 overflow-hidden bg-black"
    />
  )
}
