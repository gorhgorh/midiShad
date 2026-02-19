import { useEffect, useRef } from 'react'
import { useModuleStore } from '../store/moduleStore'
import { useLfoStore } from '../store/lfoStore'
import type { ModuleInstance, ModuleDefinition } from '../types'

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
  console.log('[callMethod]', methodName, typeof fn, args)
  if (typeof fn === 'function') {
    (fn as (a: Record<string, unknown>) => void).call(instance, args)
  } else {
    console.warn(`[callMethod] "${methodName}" not found`, { instanceVal: typeof instance[methodName], protoVal: moduleClass ? typeof moduleClass.prototype[methodName] : 'n/a' })
  }
}

export function ModuleRenderer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<ModuleInstance | null>(null)
  const activeModRef = useRef<ModuleDefinition | null>(null)
  const rafRef = useRef<number | null>(null)

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
        if (inst && mod) callMethod(inst, methodName, {}, mod.moduleClass)
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
          callMethod(instance, method, args, activeModule.moduleClass)
        }
      }

      // Option values changed? Batch by methodName so methods that accept
      // multiple options (e.g. position({left, right, top, bottom})) get
      // all values in one call.
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

      const { configs } = useLfoStore.getState()
      const elapsed = performance.now() / 1000

      for (const param of activeModule.params) {
        const lfo = configs[param.name]
        if (!lfo?.enabled) continue

        const sine = Math.sin((elapsed * 2 * Math.PI) / lfo.period) * 0.5 + 0.5
        const val = param.min + sine * (param.max - param.min)

        // Update store so sliders reflect LFO
        useModuleStore.getState().setParamValue(param.name, val)
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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        overflow: 'hidden',
        background: '#000',
      }}
    />
  )
}
