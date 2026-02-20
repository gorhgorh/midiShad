import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { ParamDescriptor } from '../types'
import { useModuleStore } from '../store/moduleStore'
import { useMidiStore } from '../store/midiStore'
import { useLfoStore, LFO_SLOT_IDS, type LfoSlotId } from '../store/lfoStore'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DIVIDER_OPTIONS } from '@/lfo/engine'

const LFO_COLORS: Record<LfoSlotId, string> = {
  lfo1: '#6ee7b7',
  lfo2: '#93c5fd',
  lfo3: '#fca5a5',
  lfo4: '#fde68a',
}

interface ParamRowProps {
  param: ParamDescriptor
  ccNumber: number | undefined
  isRelative: boolean
}

export function ParamRow({ param, ccNumber, isRelative }: ParamRowProps) {
  const modulatedValue = useModuleStore((s) => s.paramValues[param.name] ?? param.default)
  const setParamValue = useModuleStore((s) => s.setParamValue)
  const learnTarget = useMidiStore((s) => s.learnTarget)
  const setLearnTarget = useMidiStore((s) => s.setLearnTarget)
  const selectedDeviceId = useMidiStore((s) => s.selectedDeviceId)
  const assignCc = useMidiStore((s) => s.assignCc)
  const unassignParam = useMidiStore((s) => s.unassignParam)
  const toggleRelative = useMidiStore((s) => s.toggleRelative)
  const lfoAssignment = useLfoStore((s) => s.assignments[param.name] ?? null)
  const assignParam = useLfoStore((s) => s.assignParam)
  const setBaseValue = useLfoStore((s) => s.setBaseValue)
  const baseValue = useLfoStore((s) => s.baseValues[param.name] ?? param.default)
  const assignStrength = useLfoStore((s) => s.assignmentStrengths[param.name] ?? 0.5)
  const setAssignmentStrength = useLfoStore((s) => s.setAssignmentStrength)
  const assignDivider = useLfoStore((s) => s.assignmentDividers[param.name] ?? 1)
  const setAssignmentDivider = useLfoStore((s) => s.setAssignmentDivider)

  // When LFO assigned: slider shows/controls the base (offset) value, display shows modulated output
  const value = lfoAssignment ? baseValue : modulatedValue
  const isLearning = learnTarget === param.name

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  useEffect(() => {
    if (!isLearning) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLearnTarget(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isLearning, setLearnTarget])

  function startEdit() {
    if (isLearning) {
      setLearnTarget(null)
      return
    }
    setDraft(ccNumber != null ? String(ccNumber) : '')
    setEditing(true)
  }

  function commitEdit() {
    setEditing(false)
    const n = parseInt(draft, 10)
    if (!selectedDeviceId) return
    if (isNaN(n) || n < 0 || n > 127) return
    assignCc(selectedDeviceId, param.name, n)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditing(false)
    e.stopPropagation()
  }

  function onSliderChange([v]: number[]) {
    setParamValue(param.name, v)
    // Track base value for bipolar LFO
    setBaseValue(param.name, v)
  }

  const hasCc = ccNumber != null

  return (
    <div>
    <div className="flex items-center gap-1.5 py-1">
      <label className="w-[80px] shrink-0 text-xs text-white/70 truncate" title={param.label}>
        {param.label}
      </label>
      <Slider
        min={param.min}
        max={param.max}
        step={(param.max - param.min) / 200}
        value={[value]}
        onValueChange={onSliderChange}
        className="flex-1"
      />
      <span
        className="w-[38px] text-[10px] text-right tabular-nums"
        style={lfoAssignment ? { color: LFO_COLORS[lfoAssignment] } : { color: 'rgba(255,255,255,0.7)' }}
        title={lfoAssignment ? `Base: ${baseValue.toFixed(1)}` : undefined}
      >
        {modulatedValue.toFixed(1)}
      </span>

      {editing ? (
        <Input
          ref={inputRef}
          type="number"
          min={0}
          max={127}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={onKeyDown}
          className="w-[50px] h-6 text-[10px] text-center px-1"
        />
      ) : (
        <div className="flex items-center gap-0.5">
          <Button
            variant={isLearning ? 'destructive' : 'outline'}
            size="sm"
            className="h-5 px-1.5 text-[10px]"
            onClick={() => setLearnTarget(isLearning ? null : param.name)}
          >
            {isLearning ? 'Cancel' : hasCc ? `CC${ccNumber}` : 'Learn'}
          </Button>
          {!isLearning && (
            <Button
              variant="outline"
              size="sm"
              className="h-5 px-1 text-[10px]"
              onClick={startEdit}
              title="Type CC number"
            >
              #
            </Button>
          )}
          {hasCc && selectedDeviceId && (
            <>
              <Button
                variant={isRelative ? 'default' : 'outline'}
                size="sm"
                className="h-5 px-1.5 text-[10px]"
                onClick={() => toggleRelative(selectedDeviceId, param.name)}
                title={isRelative ? 'Relative mode' : 'Absolute mode'}
              >
                Rel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-5 px-1 text-[10px] text-destructive-foreground"
                onClick={() => unassignParam(selectedDeviceId, param.name)}
                title="Remove CC"
              >
                x
              </Button>
            </>
          )}
          {/* LFO assignment dropdown */}
          <Select
            value={lfoAssignment ?? '__none__'}
            onValueChange={(v) => assignParam(param.name, v === '__none__' ? null : v as LfoSlotId)}
          >
            <SelectTrigger
              className="h-5 w-[52px] px-1 text-[10px]"
              style={lfoAssignment ? { color: LFO_COLORS[lfoAssignment], borderColor: LFO_COLORS[lfoAssignment] + '80' } : undefined}
            >
              <SelectValue placeholder="LFO" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {LFO_SLOT_IDS.map((id, i) => (
                <SelectItem key={id} value={id}>
                  <span style={{ color: LFO_COLORS[id] }}>LFO {i + 1}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
    <AnimatePresence>
      {lfoAssignment && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          style={{ overflow: 'hidden' }}
        >
          <div className="flex items-center gap-1.5 py-0.5 pl-[80px]">
            <span className="text-[9px] text-white/40 shrink-0 w-[32px]">Str</span>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[assignStrength]}
              onValueChange={([v]) => setAssignmentStrength(param.name, v)}
              className="flex-1"
            />
            <span className="w-[28px] text-[9px] text-white/40 text-right tabular-nums">
              {assignStrength.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 py-0.5 pl-[80px]">
            <span className="text-[9px] text-white/40 shrink-0 w-[32px]">Div</span>
            <div className="flex flex-wrap gap-0.5 flex-1">
              {DIVIDER_OPTIONS.map((d) => (
                <Button
                  key={d.value}
                  variant="outline"
                  size="sm"
                  className={`h-4 px-1 text-[8px] min-w-0 ${assignDivider === d.value
                    ? 'bg-white/15 text-white border-white/20'
                    : 'bg-black text-white/50 border-white/10 hover:bg-white/10 hover:text-white'}`}
                  onClick={() => setAssignmentDivider(param.name, d.value)}
                >
                  {d.label}
                </Button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </div>
  )
}
