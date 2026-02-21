import { createContext, useContext, useRef, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useMidiStore } from '../store/midiStore'
import { useLfoStore, LFO_SLOT_IDS, type LfoSlotId } from '../store/lfoStore'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DIVIDER_OPTIONS } from '@/lfo/engine'

const DIVIDERS = DIVIDER_OPTIONS.filter(d => d.value < 1)
const MULTIPLIERS = DIVIDER_OPTIONS.filter(d => d.value > 1)
type DivTab = 'div' | 'none' | 'mult'

export const LFO_COLORS: Record<LfoSlotId, string> = {
  lfo1: '#6ee7b7',
  lfo2: '#93c5fd',
  lfo3: '#fca5a5',
  lfo4: '#fde68a',
}

// Context: only one config panel open at a time
interface ConfigPanelContextValue {
  openParam: string | null
  toggle: (name: string) => void
  close: () => void
}

export const ConfigPanelContext = createContext<ConfigPanelContextValue>({
  openParam: null,
  toggle: () => {},
  close: () => {},
})

export function useConfigPanel() {
  return useContext(ConfigPanelContext)
}

interface ParamConfigPanelProps {
  paramName: string
  showCc?: boolean
  onClose: () => void
}

export function ParamConfigPanel({ paramName, showCc = true, onClose }: ParamConfigPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // CC state
  const selectedDeviceId = useMidiStore((s) => s.selectedDeviceId)
  const learnTarget = useMidiStore((s) => s.learnTarget)
  const setLearnTarget = useMidiStore((s) => s.setLearnTarget)
  const assignCc = useMidiStore((s) => s.assignCc)
  const unassignParam = useMidiStore((s) => s.unassignParam)
  const toggleRelative = useMidiStore((s) => s.toggleRelative)
  const ccNumber = useMidiStore((s) => {
    if (!s.selectedDeviceId) return undefined
    return s.mappings[s.selectedDeviceId]?.[paramName]
  })
  const isRelative = useMidiStore((s) => {
    if (!s.selectedDeviceId) return false
    return !!s.relativeFlags[s.selectedDeviceId]?.[paramName]
  })

  // LFO state
  const lfoAssignment = useLfoStore((s) => s.assignments[paramName] ?? null)
  const assignParam = useLfoStore((s) => s.assignParam)
  const assignStrength = useLfoStore((s) => s.assignmentStrengths[paramName] ?? 0.5)
  const setAssignmentStrength = useLfoStore((s) => s.setAssignmentStrength)
  const assignDivider = useLfoStore((s) => s.assignmentDividers[paramName] ?? 1)
  const setAssignmentDivider = useLfoStore((s) => s.setAssignmentDivider)

  const [divTab, setDivTab] = useState<DivTab>(() => {
    if (assignDivider < 1) return 'div'
    if (assignDivider > 1) return 'mult'
    return 'none'
  })

  function onDivTabClick(tab: DivTab) {
    setDivTab(tab)
    if (tab === 'none') setAssignmentDivider(paramName, 1)
  }

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const isLearning = learnTarget === paramName
  const hasCc = ccNumber != null

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onCloseRef.current()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isLearning) setLearnTarget(null)
        else onCloseRef.current()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isLearning, setLearnTarget])

  // Clear learn target on unmount
  useEffect(() => {
    return () => {
      const state = useMidiStore.getState()
      if (state.learnTarget === paramName) {
        state.setLearnTarget(null)
      }
    }
  }, [paramName])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function startEdit() {
    if (isLearning) {
      setLearnTarget(null)
      return
    }
    setDraft(hasCc ? String(ccNumber) : '')
    setEditing(true)
  }

  function commitEdit() {
    setEditing(false)
    const n = parseInt(draft, 10)
    if (!selectedDeviceId) return
    if (isNaN(n) || n < 0 || n > 127) return
    assignCc(selectedDeviceId, paramName, n)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditing(false)
    e.stopPropagation()
  }

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="absolute right-0 top-0 z-50 w-[280px] bg-black/90 backdrop-blur-md border border-border rounded-lg p-3.5 space-y-3.5"
    >
      {/* CC Section */}
      {showCc && selectedDeviceId && (
        <div className="space-y-2">
          <h4 className="text-[10px] text-white/40 uppercase tracking-wide">MIDI CC</h4>
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
              className="w-full h-8 text-xs text-center px-2"
              placeholder="CC #"
            />
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant={isLearning ? 'destructive' : 'outline'}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => setLearnTarget(isLearning ? null : paramName)}
              >
                {isLearning ? 'Cancel' : 'Learn'}
              </Button>
              {hasCc && (
                <span className="text-xs text-white/70 tabular-nums">CC{ccNumber}</span>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={startEdit}
                title="Type CC number"
              >
                #
              </Button>
              {hasCc && selectedDeviceId && (
                <>
                  <Button
                    variant={isRelative ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => toggleRelative(selectedDeviceId, paramName)}
                    title={isRelative ? 'Relative mode' : 'Absolute mode'}
                  >
                    Rel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive-foreground"
                    onClick={() => unassignParam(selectedDeviceId, paramName)}
                    title="Remove CC mapping"
                  >
                    Unmap
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* LFO Section */}
      <div className="space-y-2 pb-1">
        <h4 className="text-[10px] text-white/40 uppercase tracking-wide">LFO</h4>
        <div className="flex items-center gap-1 flex-wrap">
          <Button
            variant={!lfoAssignment ? 'default' : 'outline'}
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={() => assignParam(paramName, null)}
          >
            None
          </Button>
          {LFO_SLOT_IDS.map((id, i) => (
            <Button
              key={id}
              variant={lfoAssignment === id ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2.5 text-xs"
              style={lfoAssignment === id ? { backgroundColor: LFO_COLORS[id] + '30', color: LFO_COLORS[id], borderColor: LFO_COLORS[id] + '80' } : undefined}
              onClick={() => assignParam(paramName, id)}
            >
              {i + 1}
            </Button>
          ))}
        </div>

        {lfoAssignment && (
          <div className="space-y-2.5 pt-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/40 shrink-0 w-[28px]">Str</span>
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={[assignStrength]}
                onValueChange={([v]) => setAssignmentStrength(paramName, v)}
                className="flex-1"
              />
              <span className="w-[34px] text-[10px] text-white/40 text-right tabular-nums">
                {assignStrength.toFixed(2)}
              </span>
            </div>
            <div>
              <div className="grid grid-cols-3 gap-1 mb-1.5">
                {(['div', 'none', 'mult'] as const).map((tab) => (
                  <Button
                    key={tab}
                    variant="outline"
                    size="sm"
                    className={`h-7 w-full text-[10px] ${divTab === tab
                      ? 'bg-white/15 text-white border-white/20'
                      : 'bg-black text-white/50 border-white/10 hover:bg-white/10 hover:text-white'}`}
                    onClick={() => onDivTabClick(tab)}
                  >
                    {tab === 'div' ? 'Div' : tab === 'none' ? 'None' : 'Mult'}
                  </Button>
                ))}
              </div>
              {divTab !== 'none' && (
                <div className="grid grid-cols-6 gap-1">
                  {(divTab === 'div' ? DIVIDERS : MULTIPLIERS).map((d) => (
                    <Button
                      key={d.value}
                      variant="outline"
                      size="sm"
                      className={`h-7 w-full px-0 text-[10px] ${assignDivider === d.value
                        ? 'bg-white/15 text-white border-white/20'
                        : 'bg-black text-white/50 border-white/10 hover:bg-white/10 hover:text-white'}`}
                      onClick={() => setAssignmentDivider(paramName, d.value)}
                    >
                      {d.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
