import { useRef, useEffect, useState, useCallback } from 'react'
import { GripVertical } from 'lucide-react'
import { FloatingPanel } from './FloatingPanel'
import { useLfoStore } from '@/store/lfoStore'
import { useMidiStore } from '@/store/midiStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const HISTORY_LEN = 200 // samples to keep
const CANVAS_W = 180
const CANVAS_H = 50

const FIXED_CCS = [81, 82, 83] as const
const CC_COLORS = ['#6ee7b7', '#93c5fd', '#fca5a5', '#fde68a']

interface CcChannelProps {
  ccNumber: number | null
  color: string
  label: string
  learnable?: boolean
  onLearn?: () => void
  onSetCc?: (n: number) => void
}

function CcChannel({ ccNumber, color, label, learnable, onLearn, onSetCc }: CcChannelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const historyRef = useRef<number[]>([])
  const rafRef = useRef<number>(0)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = CANVAS_W * dpr
    canvas.height = CANVAS_H * dpr
    ctx.scale(dpr, dpr)

    function draw() {
      if (!ctx) return
      const { ccValues } = useLfoStore.getState()
      const val = ccNumber != null ? (ccValues[ccNumber] ?? 0) : 0
      const history = historyRef.current

      // Push new sample, keep fixed length
      history.push(val)
      if (history.length > HISTORY_LEN) history.shift()

      // Clear
      ctx.fillStyle = 'rgba(0,0,0,0.85)'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 1
      for (const y of [CANVAS_H * 0.25, CANVAS_H * 0.5, CANVAS_H * 0.75]) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(CANVAS_W, y)
        ctx.stroke()
      }

      // Draw curve
      if (history.length > 1) {
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.beginPath()
        for (let i = 0; i < history.length; i++) {
          const x = (i / (HISTORY_LEN - 1)) * CANVAS_W
          const y = CANVAS_H - (history[i] / 127) * CANVAS_H
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()

        // Current value dot
        const lastX = ((history.length - 1) / (HISTORY_LEN - 1)) * CANVAS_W
        const lastY = CANVAS_H - (val / 127) * CANVAS_H
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(lastX, lastY, 3, 0, Math.PI * 2)
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(rafRef.current)
      historyRef.current = []
    }
  }, [ccNumber, color])

  const ccVal = useLfoStore((s) => ccNumber != null ? (s.ccValues[ccNumber] ?? 0) : 0)

  function commitEdit() {
    setEditing(false)
    const n = parseInt(draft, 10)
    if (!isNaN(n) && n >= 0 && n <= 127 && onSetCc) onSetCc(n)
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium" style={{ color }}>{label}</span>
          {learnable && !editing && (
            <Button
              variant="outline"
              size="sm"
              className="h-4 px-1 text-[8px]"
              onClick={() => {
                if (ccNumber == null) {
                  onLearn?.()
                } else {
                  setDraft(String(ccNumber))
                  setEditing(true)
                }
              }}
            >
              {ccNumber != null ? `CC${ccNumber}` : 'Learn'}
            </Button>
          )}
          {learnable && !editing && ccNumber != null && (
            <Button
              variant="outline"
              size="sm"
              className="h-4 px-1 text-[8px]"
              onClick={onLearn}
              title="Re-learn"
            >
              L
            </Button>
          )}
          {learnable && editing && (
            <Input
              type="number"
              min={0}
              max={127}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit()
                if (e.key === 'Escape') setEditing(false)
                e.stopPropagation()
              }}
              className="w-[42px] h-4 text-[9px] text-center px-1"
              autoFocus
            />
          )}
          {!learnable && (
            <span className="text-[9px] text-white/40">CC{ccNumber}</span>
          )}
        </div>
        <span className="text-[11px] tabular-nums font-mono" style={{ color }}>
          {ccVal}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          background: '#000',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 3,
          display: 'block',
        }}
      />
    </div>
  )
}

interface CcMonitorProps {
  visible: boolean
}

export function CcMonitor({ visible }: CcMonitorProps) {
  const [customCc, setCustomCc] = useState<number | null>(null)
  const [learning, setLearning] = useState(false)

  // Listen for any CC to learn the custom channel
  useEffect(() => {
    if (!learning) return
    const unsub = useLfoStore.subscribe((state, prev) => {
      // Find a CC that just changed
      for (const [ccStr, val] of Object.entries(state.ccValues)) {
        const cc = Number(ccStr)
        if (val !== (prev.ccValues[cc] ?? 0)) {
          setCustomCc(cc)
          setLearning(false)
          break
        }
      }
    })
    return unsub
  }, [learning])

  const handleLearn = useCallback(() => setLearning(true), [])
  const handleSetCc = useCallback((n: number) => setCustomCc(n), [])

  return (
    <FloatingPanel
      visible={visible}
      storageKey="midishad:ccMonitorPos"
      defaultPosition={{ x: 12, y: window.innerHeight - 380 }}
    >
      <div
        data-drag-handle
        className="flex items-center gap-1.5 py-2 -mx-2 px-2 border-b border-border cursor-grab active:cursor-grabbing select-none"
      >
        <GripVertical className="h-3.5 w-3.5 text-white/30 shrink-0" />
        <span className="flex-1 text-white text-xs font-medium">CC Monitor</span>
        {learning && <span className="text-[9px] text-yellow-400 animate-pulse">Move a knob...</span>}
      </div>

      <div className="pt-3 space-y-3" style={{ width: CANVAS_W }}>
        {FIXED_CCS.map((cc, i) => (
          <CcChannel
            key={cc}
            ccNumber={cc}
            color={CC_COLORS[i]}
            label={`Orbit ${['X', 'Y', 'Z'][i]}`}
          />
        ))}
        <CcChannel
          ccNumber={customCc}
          color={CC_COLORS[3]}
          label={customCc != null ? 'Custom' : 'Custom'}
          learnable
          onLearn={handleLearn}
          onSetCc={handleSetCc}
        />
      </div>
    </FloatingPanel>
  )
}
