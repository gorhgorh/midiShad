import { useRef, useEffect } from 'react'
import type { LfoShape } from '@/lfo/engine'

interface LfoWavePreviewProps {
  shape: LfoShape
  color?: string
  /** Scroll speed in cycles per second (default 0.5) */
  speed?: number
}

function waveValue(shape: LfoShape, phase: number): number {
  const p = ((phase % 1) + 1) % 1
  switch (shape) {
    case 'sine':
      return Math.sin(p * 2 * Math.PI)
    case 'triangle':
      return p < 0.5 ? (4 * p - 1) : (3 - 4 * p)
    case 'square':
      return p < 0.5 ? 1 : -1
    case 'sawtooth':
      return 2 * p - 1
    case 'noise':
      return ((Math.sin(Math.floor(phase * 8) * 127.1) * 43758.5453) % 1) * 2 - 1
  }
}

export function LfoWavePreview({ shape, color = '#6ee7b7', speed = 0.5 }: LfoWavePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    startRef.current = performance.now()

    function draw(now: number) {
      const elapsed = (now - startRef.current) / 1000
      const offset = elapsed * speed

      ctx.clearRect(0, 0, w, h)

      // Background
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fillRect(0, 0, w, h)

      // Center line
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, h / 2)
      ctx.lineTo(w, h / 2)
      ctx.stroke()

      // Playhead: thin vertical line at the left edge sweeping right
      const playheadX = ((offset % 1) * w)
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(playheadX, 0)
      ctx.lineTo(playheadX, h)
      ctx.stroke()

      // Wave — draw 2 cycles, scrolling
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()

      const steps = w
      for (let i = 0; i <= steps; i++) {
        const phase = (i / steps) * 2 + offset
        const val = waveValue(shape, phase)
        const x = (i / steps) * w
        const y = h / 2 - (val * (h / 2 - 4))
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => cancelAnimationFrame(rafRef.current)
  }, [shape, color, speed])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-[50px] rounded border border-border"
    />
  )
}
