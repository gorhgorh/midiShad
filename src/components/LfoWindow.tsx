import { useRef, useEffect } from 'react'
import { GripVertical } from 'lucide-react'
import { FloatingPanel } from './FloatingPanel'
import { LfoPanel } from './LfoPanel'
import { useLfoStore, LFO_SLOT_IDS, type LfoSlotId } from '@/store/lfoStore'
import { shapedWave } from '@/lfo/engine'
import { computeLfosInOrder } from '@/lfo/graph'
import { useClockStore } from '@/store/clockStore'
import type { LfoParamName } from '@/lfo/engine'

const SQ = 168
const MODULABLE_PARAMS: LfoParamName[] = ['hz', 'drive', 'symmetry']

const LFO_COLORS: Record<LfoSlotId, string> = {
  lfo1: '#6ee7b7',
  lfo2: '#93c5fd',
  lfo3: '#fca5a5',
  lfo4: '#fde68a',
}

function LfoSquare({ id }: { id: LfoSlotId }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = SQ * dpr
    canvas.height = SQ * dpr
    ctx.scale(dpr, dpr)

    function draw() {
      const { lfos, lfoParamMods, lfoParamBaseValues, ccValues } = useLfoStore.getState()
      const { bpm } = useClockStore.getState()
      const elapsed = performance.now() / 1000
      const color = LFO_COLORS[id]

      const { outputs: lfoOutputs } = computeLfosInOrder(lfos, lfoParamMods, lfoParamBaseValues, bpm, elapsed, ccValues)

      const baseLfo = lfos[id]
      const effective = { ...baseLfo }
      for (const param of MODULABLE_PARAMS) {
        const modKey = `${id}.${param}`
        const mod = lfoParamMods[modKey]
        if (!mod) continue
        const base = lfoParamBaseValues[modKey] ?? effective[param]
        if (mod.type === 'lfo' && mod.lfoId && lfoOutputs[mod.lfoId] !== undefined) {
          effective[param] = Math.max(0, Math.min(1, base + lfoOutputs[mod.lfoId]))
        } else if (mod.type === 'cc' && mod.ccNumber !== undefined) {
          const ccVal = ccValues[mod.ccNumber]
          if (ccVal !== undefined) effective[param] = ccVal / 127
        }
      }

      let speed: number
      if (effective.speedMode === 'hz') {
        speed = effective.hz
      } else {
        speed = (bpm / 60) * effective.divider
      }
      const offset = elapsed * speed

      ctx!.clearRect(0, 0, SQ, SQ)
      ctx!.fillStyle = '#000'
      ctx!.fillRect(0, 0, SQ, SQ)

      const centerY = effective.bipolar ? SQ / 2 : SQ - 4
      ctx!.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx!.lineWidth = 1
      ctx!.beginPath()
      ctx!.moveTo(0, centerY)
      ctx!.lineTo(SQ, centerY)
      ctx!.stroke()

      const playheadX = (offset % 1) * SQ
      ctx!.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx!.lineWidth = 1
      ctx!.beginPath()
      ctx!.moveTo(playheadX, 0)
      ctx!.lineTo(playheadX, SQ)
      ctx!.stroke()

      ctx!.strokeStyle = color
      ctx!.lineWidth = 2
      ctx!.beginPath()

      const margin = 4
      for (let i = 0; i <= SQ; i++) {
        const phase = (i / SQ) * 2 + offset
        const raw = shapedWave(effective.shape, phase, effective.drive ?? 0, effective.symmetry ?? 0.5, `_overlay_${id}`, effective.randomFreq)

        let val: number
        if (effective.bipolar) {
          val = raw
        } else {
          val = (raw + 1) / 2
        }

        let y: number
        if (effective.bipolar) {
          y = SQ / 2 - val * (SQ / 2 - margin)
        } else {
          y = (SQ - margin) - val * (SQ - margin * 2)
        }

        if (i === 0) ctx!.moveTo(i, y)
        else ctx!.lineTo(i, y)
      }
      ctx!.stroke()

      ctx!.fillStyle = color
      ctx!.font = '11px sans-serif'
      ctx!.fillText(id.replace('lfo', 'LFO '), 6, 14)

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [id])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: SQ,
        height: SQ,
        background: '#000',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 4,
      }}
    />
  )
}

interface LfoWindowProps {
  visible: boolean
}

export function LfoWindow({ visible }: LfoWindowProps) {
  return (
    <FloatingPanel
      visible={visible}
      storageKey="midishad:lfoPanelPos"
      defaultPosition={{ x: 12, y: 60 }}
    >
      <div
        data-drag-handle
        className="flex items-center gap-1.5 py-2.5 -mx-2 px-2 border-b border-border cursor-grab active:cursor-grabbing select-none"
      >
        <GripVertical className="h-3.5 w-3.5 text-white/30 shrink-0" />
        <span className="flex-1 text-white text-xs font-medium">LFO</span>
      </div>

      {/* 2x2 preview grid */}
      <div className="pt-3 flex flex-col items-center gap-1">
        <div className="flex gap-1">
          <LfoSquare id="lfo1" />
          <LfoSquare id="lfo2" />
        </div>
        <div className="flex gap-1">
          <LfoSquare id="lfo3" />
          <LfoSquare id="lfo4" />
        </div>
      </div>

      {/* LFO controls */}
      <div className="pt-4">
        <LfoPanel />
      </div>
    </FloatingPanel>
  )
}
