import { useEffect, useRef } from 'react'
import { appStore } from '../atoms/store'
import {
  activeModuleAtom,
  paramValuesAtom,
  optionValuesAtom,
  callActionAtom,
} from '../atoms/moduleAtoms'
import {
  lfosAtom,
  assignmentsAtom,
  assignmentStrengthsAtom,
  assignmentDividersAtom,
  baseValuesAtom,
  lfoParamModsAtom,
  lfoParamBaseValuesAtom,
} from '../atoms/lfoAtoms'
import { bpmAtom } from '../atoms/clockAtoms'
import { computeLfo, computeLfosInOrder } from '@almst/lfo'
import { lfoEngine } from '../lfo/instance'
import { renderState, bumpVersion, resetRenderState } from '../render/renderState'
import { animationManager } from '../render/AnimationManager'
import { registerBridge, unregisterBridge } from '../render/moduleBridge'
import { ccState } from '../render/ccState'
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
  const visibleRef = useRef(true)

  // LFO state cache — atom values cached in refs to avoid per-frame appStore.get()
  const lfoStateRef = useRef({
    lfos: appStore.get(lfosAtom),
    assignments: appStore.get(assignmentsAtom),
    assignmentStrengths: appStore.get(assignmentStrengthsAtom),
    assignmentDividers: appStore.get(assignmentDividersAtom),
    baseValues: appStore.get(baseValuesAtom),
    lfoParamMods: appStore.get(lfoParamModsAtom),
    lfoParamBaseValues: appStore.get(lfoParamBaseValuesAtom),
    bpm: appStore.get(bpmAtom),
  })

  // Mount / swap module instances + react to user/MIDI store changes
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let prevModuleId: string | null = null
    let prevParamValues: Record<string, number> = {}
    let prevOptionValues: Record<string, unknown> = {}

    function instantiate(activeModule: ModuleDefinition) {
      if (!container) return
      if (instanceRef.current) {
        instanceRef.current.destroy()
        instanceRef.current = null
      }
      activeModRef.current = activeModule
      visibleRef.current = true
      resetRenderState()

      try {
        const instance = new activeModule.moduleClass(container) as ModuleInstance
        instanceRef.current = instance

        const paramValues = appStore.get(paramValuesAtom)
        const optionValues = appStore.get(optionValuesAtom)
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

      appStore.set(callActionAtom, (methodName: string) => {
        const inst = instanceRef.current
        const mod = activeModRef.current
        if (!inst || !mod) return

        if (methodName === 'base_toggleVisibility') {
          visibleRef.current = !visibleRef.current
          if (visibleRef.current) inst.show()
          else inst.hide()
          return
        }

        callMethod(inst, methodName, {}, mod.moduleClass)
      })
    }

    // --- Bridge: MIDI hooks call this directly to update module ---
    function bridgeFn(paramUpdates: Record<string, number>, baseUpdates: Record<string, number>) {
      const instance = instanceRef.current
      const activeModule = activeModRef.current
      if (!instance || !activeModule) return

      // Group by method and call module methods directly
      const batched: Record<string, Record<string, unknown>> = {}
      for (const param of activeModule.params) {
        if (param.name in paramUpdates) {
          const key = param.methodName
          if (!batched[key]) batched[key] = {}
          batched[key][param.name] = paramUpdates[param.name]
        }
      }
      for (const [method, args] of Object.entries(batched)) {
        const isBase = Object.keys(args).some((k) => k in BASE_ARG_MAP)
        const remapped = isBase ? remapBaseArgs(args) : args
        callMethod(instance, method, remapped, activeModule.moduleClass)
      }

      // Update LFO base values directly (no Jotai)
      Object.assign(lfoStateRef.current.baseValues, baseUpdates)

      // Update render state for UI readout
      Object.assign(renderState.modulatedParams, paramUpdates)
      bumpVersion()
    }

    registerBridge(bridgeFn)

    // Fire immediately with current state
    const initialActiveModule = appStore.get(activeModuleAtom)
    if (initialActiveModule) {
      prevModuleId = initialActiveModule.id
      prevParamValues = appStore.get(paramValuesAtom)
      prevOptionValues = appStore.get(optionValuesAtom)
      instantiate(initialActiveModule)
    }

    // Subscribe to activeModule changes
    const unsubModule = appStore.sub(activeModuleAtom, () => {
      const activeModule = appStore.get(activeModuleAtom)
      const moduleId = activeModule?.id ?? null
      if (moduleId !== prevModuleId) {
        prevModuleId = moduleId
        prevParamValues = appStore.get(paramValuesAtom)
        prevOptionValues = appStore.get(optionValuesAtom)
        if (activeModule) {
          instantiate(activeModule)
        } else {
          if (instanceRef.current) {
            instanceRef.current.destroy()
            instanceRef.current = null
          }
          activeModRef.current = null
        }
      }
    })

    // Subscribe to paramValues changes (UI slider-driven changes only)
    const unsubParams = appStore.sub(paramValuesAtom, () => {
      const instance = instanceRef.current
      const activeModule = activeModRef.current
      if (!instance || !activeModule) return

      const paramValues = appStore.get(paramValuesAtom)
      if (paramValues !== prevParamValues) {
        prevParamValues = paramValues
        const batched: Record<string, Record<string, unknown>> = {}
        for (const param of activeModule.params) {
          if (param.name in paramValues) {
            const key = param.methodName
            if (!batched[key]) batched[key] = {}
            batched[key][param.name] = paramValues[param.name]
          }
        }
        for (const [method, args] of Object.entries(batched)) {
          const isBase = Object.keys(args).some((k) => k in BASE_ARG_MAP)
          const remapped = isBase ? remapBaseArgs(args) : args
          callMethod(instance, method, remapped, activeModule.moduleClass)
        }
      }
    })

    // Subscribe to optionValues changes
    const unsubOptions = appStore.sub(optionValuesAtom, () => {
      const instance = instanceRef.current
      const activeModule = activeModRef.current
      if (!instance || !activeModule) return

      const optionValues = appStore.get(optionValuesAtom)
      if (optionValues !== prevOptionValues) {
        prevOptionValues = optionValues
        const batched: Record<string, Record<string, unknown>> = {}
        for (const opt of activeModule.options) {
          if (opt.name in optionValues) {
            const key = opt.methodName
            if (!batched[key]) batched[key] = {}
            batched[key][opt.name] = optionValues[opt.name]
          }
        }
        for (const [method, args] of Object.entries(batched)) {
          callMethod(instance, method, args, activeModule.moduleClass)
        }
      }
    })

    return () => {
      unregisterBridge()
      unsubModule()
      unsubParams()
      unsubOptions()
      appStore.set(callActionAtom, null)
      if (instanceRef.current) {
        instanceRef.current.destroy()
        instanceRef.current = null
      }
    }
  }, [])

  // Subscribe to LFO-related atom changes and update cache
  useEffect(() => {
    const unsubs = [
      appStore.sub(lfosAtom, () => { lfoStateRef.current.lfos = appStore.get(lfosAtom) }),
      appStore.sub(assignmentsAtom, () => { lfoStateRef.current.assignments = appStore.get(assignmentsAtom) }),
      appStore.sub(assignmentStrengthsAtom, () => { lfoStateRef.current.assignmentStrengths = appStore.get(assignmentStrengthsAtom) }),
      appStore.sub(assignmentDividersAtom, () => { lfoStateRef.current.assignmentDividers = appStore.get(assignmentDividersAtom) }),
      appStore.sub(baseValuesAtom, () => { lfoStateRef.current.baseValues = appStore.get(baseValuesAtom) }),
      appStore.sub(lfoParamModsAtom, () => { lfoStateRef.current.lfoParamMods = appStore.get(lfoParamModsAtom) }),
      appStore.sub(lfoParamBaseValuesAtom, () => { lfoStateRef.current.lfoParamBaseValues = appStore.get(lfoParamBaseValuesAtom) }),
      appStore.sub(bpmAtom, () => { lfoStateRef.current.bpm = appStore.get(bpmAtom) }),
    ]
    return () => unsubs.forEach(u => u())
  }, [])

  // LFO animation loop — writes to renderState + calls module methods directly
  useEffect(() => {
    function lfoTick() {
      const instance = instanceRef.current
      const activeModule = activeModRef.current
      if (!instance || !activeModule) return

      // Read from cache (atoms) + ccState (mutable)
      const { lfos, assignments, assignmentStrengths, assignmentDividers, baseValues, lfoParamMods, lfoParamBaseValues, bpm } = lfoStateRef.current
      // CC values read directly from mutable state (zero-alloc)
      const ccValues = ccState.ccValues

      // Early exit: no assignments at all
      const assignmentKeys = Object.keys(assignments)
      if (assignmentKeys.length === 0 || assignmentKeys.every((k) => !assignments[k])) return
      const elapsed = performance.now() / 1000

      const { outputs: lfoOutputs, effectives } = computeLfosInOrder(lfos, lfoParamMods, lfoParamBaseValues, bpm, elapsed, ccValues, lfoEngine.noiseState)

      const paramUpdates: Record<string, number> = {}

      for (const param of activeModule.params) {
        const lfoId = assignments[param.name]
        if (!lfoId) continue

        const lfo = lfos[lfoId]
        if (!lfo) continue

        const assignDiv = assignmentDividers[param.name] ?? 1
        let lfoOutput: number
        if (assignDiv === 1) {
          lfoOutput = lfoOutputs[lfoId]
        } else {
          lfoOutput = computeLfo(effectives[lfoId], bpm, elapsed, lfoId, lfoEngine.noiseState, assignDiv)
        }

        const strength = assignmentStrengths[param.name] ?? 0.5
        const base = baseValues[param.name] ?? param.default

        const t = lfoOutput >= -1 && lfoOutput <= 0
          ? (lfoOutput + 1) / 2
          : lfoOutput <= 1
            ? (lfoOutput + 1) / 2
            : lfoOutput
        const lo = base - strength * (base - param.min)
        const hi = base + strength * (param.max - base)
        let val = lo + t * (hi - lo)
        val = Math.max(param.min, Math.min(param.max, val))
        paramUpdates[param.name] = val
      }

      if (Object.keys(paramUpdates).length > 0) {
        Object.assign(renderState.modulatedParams, paramUpdates)

        const batched: Record<string, Record<string, unknown>> = {}
        for (const param of activeModule.params) {
          if (!(param.name in paramUpdates)) continue
          const key = param.methodName
          if (!batched[key]) batched[key] = {}
          batched[key][param.name] = paramUpdates[param.name]
        }
        for (const [method, args] of Object.entries(batched)) {
          const isBase = Object.keys(args).some((k) => k in BASE_ARG_MAP)
          const remapped = isBase ? remapBaseArgs(args) : args
          callMethod(instance, method, remapped, activeModule.moduleClass)
        }
      }

      // Boolean options: LFO toggles with 10%/90% threshold
      let optionsChanged = false
      for (const opt of activeModule.options) {
        if (opt.type !== 'boolean') continue
        const lfoId = assignments[opt.name]
        if (!lfoId) continue

        const lfo = lfos[lfoId]
        if (!lfo) continue

        const lfoOutput = lfoOutputs[lfoId]
        const normalized = lfo.bipolar
          ? (lfoOutput + 1) / 2
          : lfoOutput
        const current = renderState.modulatedOptions[opt.name]
        if (normalized < 0.1 && current !== false) {
          renderState.modulatedOptions[opt.name] = false
          optionsChanged = true
          const args: Record<string, unknown> = {}
          args[opt.name] = false
          callMethod(instance, opt.methodName, args, activeModule.moduleClass)
        } else if (normalized > 0.9 && current !== true) {
          renderState.modulatedOptions[opt.name] = true
          optionsChanged = true
          const args: Record<string, unknown> = {}
          args[opt.name] = true
          callMethod(instance, opt.methodName, args, activeModule.moduleClass)
        }
      }

      if (Object.keys(paramUpdates).length > 0 || optionsChanged) {
        bumpVersion()
      }
    }

    animationManager.register('lfo', lfoTick)
    return () => {
      animationManager.unregister('lfo')
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="module-container fixed inset-0 w-screen h-screen z-0 overflow-hidden bg-black"
    />
  )
}
