import { useRef, useEffect, useState, useCallback } from 'react'
import { useAtomValue } from 'jotai'
import { GripVertical, Plus, X } from 'lucide-react'
import { FloatingPanel } from './FloatingPanel'
import { ccState, onCcChange } from '@/render/ccState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { mappingsAtom, selectedDeviceIdAtom } from '@/atoms/midiAtoms'
import { activeModuleAtom } from '@/atoms/moduleAtoms'

const HISTORY_LEN = 400
const CANVAS_W = 180
const CANVAS_H = 50
const MAX_SLOTS = 4
const TRAIL_SEGMENTS = 4 // number of opacity batches for trail

const CC_COLORS = ['#6ee7b7', '#93c5fd', '#fca5a5', '#fde68a']

/** Convert hex color + alpha 0-1 to rgba string */
function colorAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

interface CcChannelProps {
  ccNumber: number | null
  color: string
  label: string
  onLearn?: () => void
  onSetCc?: (n: number) => void
  onRemove?: () => void
  isLearning?: boolean
}

function CcChannel({ ccNumber, color, label, onLearn, onSetCc, onRemove, isLearning }: CcChannelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const historyRef = useRef<number[]>([])
  const rafRef = useRef<number>(0)
  const valueRef = useRef(0)
  const valueLabelRef = useRef<HTMLSpanElement>(null)

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
      const ccValues = ccState.ccValues
      const val = ccNumber != null ? (ccValues[ccNumber] ?? 0) : 0
      const history = historyRef.current

      if (val !== valueRef.current) {
        valueRef.current = val
        if (valueLabelRef.current) {
          valueLabelRef.current.textContent = String(val)
        }
      }

      history.push(val)
      if (history.length > HISTORY_LEN) history.shift()

      // Clear
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 1
      for (const gy of [CANVAS_H * 0.25, CANVAS_H * 0.5, CANVAS_H * 0.75]) {
        ctx.beginPath()
        ctx.moveTo(0, gy)
        ctx.lineTo(CANVAS_W, gy)
        ctx.stroke()
      }

      if (history.length > 1) {
        // Additive blending — overlapping lines accumulate brightness
        ctx.globalCompositeOperation = 'lighter'

        const len = history.length
        const batchSize = Math.ceil(len / TRAIL_SEGMENTS)

        for (let b = 0; b < TRAIL_SEGMENTS; b++) {
          const start = b * batchSize
          const end = Math.min(start + batchSize + 1, len) // +1 for overlap
          if (start >= len) break

          const t = (b + 1) / TRAIL_SEGMENTS // 0.25 → 1.0
          ctx.strokeStyle = colorAlpha(color, 0.08 + 0.35 * t)
          ctx.lineWidth = 0.5 + 1.5 * t
          ctx.beginPath()
          for (let i = start; i < end; i++) {
            const x = (i / (HISTORY_LEN - 1)) * CANVAS_W
            const y = CANVAS_H - (history[i] / 127) * CANVAS_H
            if (i === start) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.stroke()
        }

        // Glow dot at leading edge
        ctx.globalCompositeOperation = 'source-over'
        const lastX = ((len - 1) / (HISTORY_LEN - 1)) * CANVAS_W
        const lastY = CANVAS_H - (val / 127) * CANVAS_H
        ctx.shadowColor = color
        ctx.shadowBlur = 6
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(lastX, lastY, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(rafRef.current)
      historyRef.current = []
    }
  }, [ccNumber, color])

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium" style={{ color }}>{label}</span>
          <Input
            type="number"
            min={0}
            max={127}
            value={ccNumber ?? ''}
            placeholder="—"
            onChange={(e) => {
              const n = parseInt(e.target.value, 10)
              if (!isNaN(n) && n >= 0 && n <= 127) onSetCc?.(n)
            }}
            onKeyDown={(e) => e.stopPropagation()}
            className="w-[38px] h-4 text-[9px] text-center px-0.5"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-4 px-1 text-[8px]"
            onClick={onLearn}
            title={isLearning ? 'Listening...' : 'Learn CC'}
          >
            {isLearning ? '...' : 'L'}
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <span ref={valueLabelRef} className="text-[11px] tabular-nums font-mono" style={{ color }}>
            {valueRef.current}
          </span>
          {onRemove && (
            <button
              onClick={onRemove}
              className="text-white/30 hover:text-white/60 transition-colors"
              title="Remove slot"
            >
              <X size={10} />
            </button>
          )}
        </div>
      </div>
      <canvas
        ref={canvasRef}
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          background: '#000',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
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
  const mappings = useAtomValue(mappingsAtom)
  const activeModule = useAtomValue(activeModuleAtom)
  const selectedDeviceId = useAtomValue(selectedDeviceIdAtom)

  // Per-module manual overrides: moduleId -> slots array
  const [moduleOverrides, setModuleOverrides] = useState<Record<string, (number | null)[]>>({})
  const [learningSlot, setLearningSlot] = useState<number | null>(null)

  const moduleId = activeModule?.id ?? null

  // On module switch: snapshot auto-populated CCs into overrides (once)
  // so slots are stable and only change via explicit user action
  useEffect(() => {
    if (!moduleId) return
    // Already has an override — don't touch
    if (moduleOverrides[moduleId]) return

    if (!activeModule || !selectedDeviceId) {
      // No mappings available — seed with one empty slot
      setModuleOverrides((prev) => ({ ...prev, [moduleId]: [null] }))
      return
    }

    const deviceMap = mappings[selectedDeviceId]
    if (!deviceMap) {
      setModuleOverrides((prev) => ({ ...prev, [moduleId]: [null] }))
      return
    }

    const paramNames = new Set(activeModule.params.map((p) => p.name))
    const ccs: (number | null)[] = []
    for (const [paramName, ccNumber] of Object.entries(deviceMap)) {
      if (paramNames.has(paramName) && !ccs.includes(ccNumber)) {
        ccs.push(ccNumber)
        if (ccs.length >= MAX_SLOTS) break
      }
    }

    setModuleOverrides((prev) => ({
      ...prev,
      [moduleId]: ccs.length > 0 ? ccs : [null],
    }))
  }, [moduleId]) // only on module switch — not on mappings change

  // Resolved slots — always from overrides (seeded above)
  const slots: (number | null)[] = (moduleId && moduleOverrides[moduleId]) || [null]

  // Update overrides helper
  const setSlots = useCallback((newSlots: (number | null)[]) => {
    if (!moduleId) return
    setModuleOverrides((prev) => ({ ...prev, [moduleId]: newSlots }))
  }, [moduleId])

  // CC learn listener
  useEffect(() => {
    if (learningSlot == null) return
    onCcChange((cc) => {
      const updated = [...slots]
      if (learningSlot < updated.length) {
        updated[learningSlot] = cc
      }
      setSlots(updated)
      setLearningSlot(null)
    })
    return () => onCcChange(null)
  }, [learningSlot, slots, setSlots])

  // Clear learning state on module switch
  useEffect(() => {
    setLearningSlot(null)
  }, [moduleId])

  // Build label for a slot — try to find param name from mappings
  const getLabel = useCallback((ccNumber: number | null, index: number) => {
    if (ccNumber == null) return `Slot ${index + 1}`
    if (!selectedDeviceId) return `CC${ccNumber}`
    const deviceMap = mappings[selectedDeviceId]
    if (!deviceMap) return `CC${ccNumber}`
    // Find param mapped to this CC
    for (const [paramName, cc] of Object.entries(deviceMap)) {
      if (cc === ccNumber) return paramName
    }
    return `CC${ccNumber}`
  }, [mappings, selectedDeviceId])

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
        {learningSlot != null && <span className="text-[9px] text-yellow-400 animate-pulse">Move a knob...</span>}
      </div>

      <div className="pt-3 space-y-3" style={{ width: CANVAS_W }}>
        {slots.map((cc, i) => (
          <CcChannel
            key={`${moduleId}-${i}`}
            ccNumber={cc}
            color={CC_COLORS[i % CC_COLORS.length]}
            label={getLabel(cc, i)}
            isLearning={learningSlot === i}
            onLearn={() => setLearningSlot(i)}
            onSetCc={(n) => {
              const updated = [...slots]
              updated[i] = n
              setSlots(updated)
            }}
            onRemove={() => {
              const updated = slots.filter((_, j) => j !== i)
              setSlots(updated.length > 0 ? updated : [null])
            }}
          />
        ))}
        {slots.length < MAX_SLOTS && (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-5 text-[9px] text-white/50"
            onClick={() => setSlots([...slots, null])}
          >
            <Plus size={10} className="mr-1" />
            Add CC
          </Button>
        )}
      </div>
    </FloatingPanel>
  )
}
