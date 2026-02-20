import { type LfoDefinition, type LfoParamName, computeLfo } from './engine'
import type { LfoSlotId } from '../store/lfoStore'

export interface LfoParamModSource {
  type: 'lfo' | 'cc'
  lfoId?: LfoSlotId
  ccNumber?: number
}

/**
 * Check if adding a mod from sourceLfoId → targetLfoId's param would create a cycle.
 * Uses DFS from targetLfoId to see if we can reach sourceLfoId.
 */
export function wouldCreateCycle(
  currentMods: Record<string, LfoParamModSource | null>,
  targetLfoId: LfoSlotId,
  sourceLfoId: LfoSlotId,
): boolean {
  if (targetLfoId === sourceLfoId) return true

  // Build adjacency: lfoA → lfoB means "lfoA modulates some param of lfoB"
  // We want to check: does sourceLfoId already depend (directly/indirectly) on targetLfoId?
  // i.e. can we walk from sourceLfoId following "who modulates me" edges and reach targetLfoId?

  // Build reverse map: for each LFO, which LFOs modulate it?
  const modulatedBy = new Map<string, Set<string>>()
  for (const [key, mod] of Object.entries(currentMods)) {
    if (!mod || mod.type !== 'lfo' || !mod.lfoId) continue
    // key is like "lfo2.strength" — the target LFO is the prefix
    const dot = key.indexOf('.')
    if (dot === -1) continue
    const targetId = key.substring(0, dot)
    if (!modulatedBy.has(targetId)) modulatedBy.set(targetId, new Set())
    modulatedBy.get(targetId)!.add(mod.lfoId)
  }

  // Also add the proposed new edge: sourceLfoId modulates targetLfoId
  // We need to check if sourceLfoId depends on targetLfoId
  // DFS: start from sourceLfoId, follow "who modulates me" edges
  const visited = new Set<string>()
  const stack = [sourceLfoId as string]
  while (stack.length > 0) {
    const current = stack.pop()!
    if (current === targetLfoId) return true
    if (visited.has(current)) continue
    visited.add(current)
    const deps = modulatedBy.get(current)
    if (deps) {
      for (const dep of deps) stack.push(dep)
    }
  }
  return false
}

/**
 * Topological sort of LFOs using Kahn's algorithm.
 * Returns compute order: LFOs with no dependencies first.
 */
export function topoSortLfos(
  mods: Record<string, LfoParamModSource | null>,
  lfoIds: readonly LfoSlotId[] = ['lfo1', 'lfo2', 'lfo3', 'lfo4'],
): LfoSlotId[] {
  // Build in-degree map: how many LFO sources modulate each LFO?
  const inDegree = new Map<string, number>()
  const edges = new Map<string, Set<string>>() // source → targets

  for (const id of lfoIds) {
    inDegree.set(id, 0)
    edges.set(id, new Set())
  }

  for (const [key, mod] of Object.entries(mods)) {
    if (!mod || mod.type !== 'lfo' || !mod.lfoId) continue
    const dot = key.indexOf('.')
    if (dot === -1) continue
    const targetId = key.substring(0, dot)
    if (!inDegree.has(targetId) || !inDegree.has(mod.lfoId)) continue
    // mod.lfoId → targetId (source modulates target, so target depends on source)
    if (!edges.get(mod.lfoId)!.has(targetId)) {
      edges.get(mod.lfoId)!.add(targetId)
      inDegree.set(targetId, (inDegree.get(targetId) ?? 0) + 1)
    }
  }

  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }

  const result: LfoSlotId[] = []
  while (queue.length > 0) {
    const current = queue.shift()!
    result.push(current as LfoSlotId)
    for (const target of edges.get(current) ?? []) {
      const newDeg = (inDegree.get(target) ?? 1) - 1
      inDegree.set(target, newDeg)
      if (newDeg === 0) queue.push(target)
    }
  }

  // If cycle somehow exists (shouldn't if validation works), append missing
  for (const id of lfoIds) {
    if (!result.includes(id)) result.push(id)
  }

  return result
}

/**
 * Compute all LFOs in dependency order, applying LFO-to-LFO and CC modulations.
 * Returns map of lfoId → output value.
 */
export function computeLfosInOrder(
  lfos: Record<LfoSlotId, LfoDefinition>,
  mods: Record<string, LfoParamModSource | null>,
  baseValues: Record<string, number>,
  bpm: number,
  timeSec: number,
  ccValues: Record<number, number>,
): Record<LfoSlotId, number> {
  const order = topoSortLfos(mods)
  const outputs: Record<string, number> = {}

  for (const lfoId of order) {
    const baseLfo = lfos[lfoId]
    if (!baseLfo) {
      outputs[lfoId] = 0
      continue
    }

    // Build effective LFO definition by applying modulations to params
    const effective = { ...baseLfo }

    const modulableParams: LfoParamName[] = ['strength', 'hz', 'drive', 'symmetry']
    for (const param of modulableParams) {
      const modKey = `${lfoId}.${param}`
      const mod = mods[modKey]
      if (!mod) continue

      const base = baseValues[modKey] ?? effective[param]

      if (mod.type === 'lfo' && mod.lfoId && outputs[mod.lfoId] !== undefined) {
        // LFO modulation: source output (already computed) offsets the base value
        const sourceOutput = outputs[mod.lfoId]
        effective[param] = Math.max(0, Math.min(1, base + sourceOutput))
      } else if (mod.type === 'cc' && mod.ccNumber !== undefined) {
        const ccVal = ccValues[mod.ccNumber]
        if (ccVal !== undefined) {
          // CC value is 0–127, normalize to param range (all 0–1 for these params)
          effective[param] = ccVal / 127
        }
      }
    }

    outputs[lfoId] = computeLfo(effective, bpm, timeSec, lfoId)
  }

  return outputs as Record<LfoSlotId, number>
}
