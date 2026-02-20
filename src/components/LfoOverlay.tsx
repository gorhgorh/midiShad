import { useRef, useEffect } from 'react'
import { useLfoStore, LFO_SLOT_IDS, type LfoSlotId } from '@/store/lfoStore'
import { shapedWave, type LfoParamName } from '@/lfo/engine'
import { computeLfosInOrder } from '@/lfo/graph'
import { useClockStore } from '@/store/clockStore'

const SIZE = 150

const LFO_COLORS: Record<LfoSlotId, string> = {
  lfo1: '#6ee7b7',
  lfo2: '#93c5fd',
  lfo3: '#fca5a5',
  lfo4: '#fde68a',
}

const MODULABLE_PARAMS: LfoParamName[] = ['strength', 'hz', 'drive', 'symmetry']

function LfoSquare({ id }: { id: LfoSlotId }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = SIZE * dpr
    canvas.height = SIZE * dpr
    ctx.scale(dpr, dpr)

    function draw() {
      const { lfos, lfoParamMods, lfoParamBaseValues, ccValues } = useLfoStore.getState()
      const { bpm } = useClockStore.getState()
      const elapsed = performance.now() / 1000
      const color = LFO_COLORS[id]

      // Compute all LFO outputs with modulation applied
      const lfoOutputs = computeLfosInOrder(lfos, lfoParamMods, lfoParamBaseValues, bpm, elapsed, ccValues)

      // Build effective definition for this LFO (with modulations applied)
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

      ctx!.clearRect(0, 0, SIZE, SIZE)
      ctx!.fillStyle = '#000'
      ctx!.fillRect(0, 0, SIZE, SIZE)

      // Center line
      const centerY = effective.bipolar ? SIZE / 2 : SIZE - 4
      ctx!.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx!.lineWidth = 1
      ctx!.beginPath()
      ctx!.moveTo(0, centerY)
      ctx!.lineTo(SIZE, centerY)
      ctx!.stroke()

      // Playhead
      const playheadX = (offset % 1) * SIZE
      ctx!.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx!.lineWidth = 1
      ctx!.beginPath()
      ctx!.moveTo(playheadX, 0)
      ctx!.lineTo(playheadX, SIZE)
      ctx!.stroke()

      // Waveform — uses effective (modulated) params
      ctx!.strokeStyle = color
      ctx!.lineWidth = 2
      ctx!.beginPath()

      const margin = 4
      for (let i = 0; i <= SIZE; i++) {
        const phase = (i / SIZE) * 2 + offset
        const raw = shapedWave(effective.shape, phase, effective.drive ?? 0, effective.symmetry ?? 0.5, `_overlay_${id}`, effective.randomFreq)

        let val: number
        if (effective.bipolar) {
          val = raw * effective.strength
        } else {
          val = ((raw + 1) / 2) * effective.strength
        }

        let y: number
        if (effective.bipolar) {
          y = SIZE / 2 - val * (SIZE / 2 - margin)
        } else {
          y = (SIZE - margin) - val * (SIZE - margin * 2)
        }

        if (i === 0) ctx!.moveTo(i, y)
        else ctx!.lineTo(i, y)
      }
      ctx!.stroke()

      // Label
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
        width: SIZE,
        height: SIZE,
        background: '#000',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 4,
      }}
    />
  )
}

export function LfoOverlay() {
  const show = useLfoStore((s) => s.showLfoOverlay)

  if (!show) return null

  return (
    <div style={{
      position: 'fixed',
      top: 12,
      left: 12,
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      pointerEvents: 'none',
    }}>
      <div style={{ display: 'flex', gap: 4 }}>
        <LfoSquare id="lfo1" />
        <LfoSquare id="lfo2" />
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <LfoSquare id="lfo3" />
        <LfoSquare id="lfo4" />
      </div>
    </div>
  )
}
