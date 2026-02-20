import { useRef, useEffect } from 'react'
import { shapedWave, type LfoParamName } from '@/lfo/engine'
import { computeLfosInOrder } from '@/lfo/graph'
import { useLfoStore, type LfoSlotId } from '@/store/lfoStore'
import { useClockStore } from '@/store/clockStore'

const MODULABLE_PARAMS: LfoParamName[] = ['hz', 'drive', 'symmetry']

interface LfoWavePreviewProps {
  lfoId: LfoSlotId
  color?: string
}

export function LfoWavePreview({ lfoId, color = '#6ee7b7' }: LfoWavePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const c = canvas.getContext('2d')
    if (!c) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    c.scale(dpr, dpr)

    function draw() {
      const { lfos, lfoParamMods, lfoParamBaseValues, ccValues } = useLfoStore.getState()
      const { bpm } = useClockStore.getState()
      const elapsed = performance.now() / 1000

      // Compute all LFO outputs with modulation
      const lfoOutputs = computeLfosInOrder(lfos, lfoParamMods, lfoParamBaseValues, bpm, elapsed, ccValues)

      // Build effective definition (with modulations applied)
      const baseLfo = lfos[lfoId]
      const lfo = { ...baseLfo }
      for (const param of MODULABLE_PARAMS) {
        const modKey = `${lfoId}.${param}`
        const mod = lfoParamMods[modKey]
        if (!mod) continue
        const base = lfoParamBaseValues[modKey] ?? lfo[param]
        if (mod.type === 'lfo' && mod.lfoId && lfoOutputs[mod.lfoId] !== undefined) {
          lfo[param] = Math.max(0, Math.min(1, base + lfoOutputs[mod.lfoId]))
        } else if (mod.type === 'cc' && mod.ccNumber !== undefined) {
          const ccVal = ccValues[mod.ccNumber]
          if (ccVal !== undefined) lfo[param] = ccVal / 127
        }
      }

      const speed = lfo.speedMode === 'hz' ? lfo.hz : (bpm / 60) * lfo.divider
      const offset = elapsed * speed

      c!.clearRect(0, 0, w, h)
      c!.fillStyle = 'rgba(0,0,0,0.4)'
      c!.fillRect(0, 0, w, h)

      // Center line
      const centerY = lfo.bipolar ? h / 2 : h - 4
      c!.strokeStyle = 'rgba(255,255,255,0.1)'
      c!.lineWidth = 1
      c!.beginPath()
      c!.moveTo(0, centerY)
      c!.lineTo(w, centerY)
      c!.stroke()

      // Playhead
      const playheadX = (offset % 1) * w
      c!.strokeStyle = 'rgba(255,255,255,0.25)'
      c!.lineWidth = 1
      c!.beginPath()
      c!.moveTo(playheadX, 0)
      c!.lineTo(playheadX, h)
      c!.stroke()

      // Waveform — 2 cycles, using effective params
      c!.strokeStyle = color
      c!.lineWidth = 2
      c!.beginPath()

      const steps = w
      const margin = 4
      for (let i = 0; i <= steps; i++) {
        const phase = (i / steps) * 2 + offset
        const raw = shapedWave(lfo.shape, phase, lfo.drive ?? 0, lfo.symmetry ?? 0.5, `_preview_${lfoId}`, lfo.randomFreq)

        let val: number
        if (lfo.bipolar) {
          val = raw
        } else {
          val = (raw + 1) / 2
        }

        const x = (i / steps) * w
        let y: number
        if (lfo.bipolar) {
          y = h / 2 - val * (h / 2 - margin)
        } else {
          y = (h - margin) - val * (h - margin * 2)
        }

        if (i === 0) c!.moveTo(x, y)
        else c!.lineTo(x, y)
      }
      c!.stroke()

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [lfoId, color])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-[50px] rounded border border-border"
    />
  )
}
