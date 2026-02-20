import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LfoWavePreview } from './LfoWavePreview'
import { useLfoStore, LFO_SLOT_IDS, type LfoSlotId } from '@/store/lfoStore'
import type { LfoShape, Divider, LfoParamName } from '@/lfo/engine'

const SHAPES: { value: LfoShape; label: string }[] = [
  { value: 'sine', label: 'Sin' },
  { value: 'triangle', label: 'Tri' },
  { value: 'square', label: 'Sq' },
  { value: 'sawtooth', label: 'Saw' },
  { value: 'noise', label: 'S&H' },
]

const DIVIDERS: { value: Divider; label: string }[] = [
  { value: 0.25, label: '1/4' },
  { value: 0.5, label: '1/2' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 4, label: '4' },
]

const LFO_COLORS: Record<LfoSlotId, string> = {
  lfo1: '#6ee7b7',
  lfo2: '#93c5fd',
  lfo3: '#fca5a5',
  lfo4: '#fde68a',
}

const LFO_LABELS: Record<LfoSlotId, string> = {
  lfo1: 'LFO 1',
  lfo2: 'LFO 2',
  lfo3: 'LFO 3',
  lfo4: 'LFO 4',
}

function LfoParamModRow({ lfoId, param }: { lfoId: LfoSlotId; param: LfoParamName }) {
  const modKey = `${lfoId}.${param}`
  const mod = useLfoStore((s) => s.lfoParamMods[modKey])
  const setLfoParamMod = useLfoStore((s) => s.setLfoParamMod)
  const lfoLearnTarget = useLfoStore((s) => s.lfoLearnTarget)
  const setLfoLearnTarget = useLfoStore((s) => s.setLfoLearnTarget)

  const isLearning = lfoLearnTarget === modKey

  const currentValue = !mod
    ? 'none'
    : mod.type === 'cc'
      ? 'cc'
      : mod.lfoId ?? 'none'

  function handleChange(value: string) {
    if (value === 'none') {
      setLfoParamMod(lfoId, param, null)
      if (isLearning) setLfoLearnTarget(null)
    } else if (value === 'cc_learn') {
      setLfoLearnTarget(modKey)
      setLfoParamMod(lfoId, param, { type: 'cc' })
    } else {
      const ok = setLfoParamMod(lfoId, param, { type: 'lfo', lfoId: value as LfoSlotId })
      if (!ok) {
        console.warn(`Cycle detected: cannot route ${value} → ${lfoId}.${param}`)
      }
    }
  }

  return (
    <Select value={currentValue} onValueChange={handleChange}>
      <SelectTrigger className="h-5 w-[68px] text-[9px] px-1.5 py-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none" className="text-[10px]">None</SelectItem>
        {LFO_SLOT_IDS.filter((id) => id !== lfoId).map((id) => (
          <SelectItem key={id} value={id} className="text-[10px]" style={{ color: LFO_COLORS[id] }}>
            {LFO_LABELS[id]}
          </SelectItem>
        ))}
        <SelectItem value="cc_learn" className="text-[10px]">
          {isLearning ? 'Learning...' : mod?.type === 'cc' ? `CC ${mod.ccNumber ?? '?'}` : 'CC Learn'}
        </SelectItem>
      </SelectContent>
    </Select>
  )
}

function LfoSlotEditor({ id }: { id: LfoSlotId }) {
  const lfo = useLfoStore((s) => s.lfos[id])
  const setLfo = useLfoStore((s) => s.setLfo)
  const color = LFO_COLORS[id]

  return (
    <div className="space-y-4 py-1">
      <LfoWavePreview lfoId={id} color={color} />

      {/* Shape selector */}
      <div className="space-y-1.5">
        <Label className="text-[10px] text-white/70">Shape</Label>
        <ButtonGroup>
          {SHAPES.map((s) => (
            <Button
              key={s.value}
              size="xs"
              variant="outline"
              className={lfo.shape === s.value
                ? 'bg-white/15 text-white border-white/20'
                : 'bg-black text-white/70 border-white/10 hover:bg-white/10 hover:text-white'}
              onClick={() => setLfo(id, { shape: s.value })}
            >
              {s.label}
            </Button>
          ))}
        </ButtonGroup>
      </div>

      {/* Random Freq — visible for S&H (noise) */}
      {lfo.shape === 'noise' && (
        <div className="flex items-center justify-between py-0.5">
          <Label className="text-[10px] text-white/70">Random Freq</Label>
          <Switch
            checked={lfo.randomFreq ?? false}
            onCheckedChange={(v) => setLfo(id, { randomFreq: v })}
          />
        </div>
      )}

      {/* Drive */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-white/70">Drive</Label>
            <LfoParamModRow lfoId={id} param="drive" />
          </div>
          <span className="text-[10px] text-white/70 tabular-nums">{(lfo.drive ?? 0).toFixed(2)}</span>
        </div>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[lfo.drive ?? 0]}
          onValueChange={([v]) => setLfo(id, { drive: v })}
        />
      </div>

      {/* Symmetry — visible for triangle, sawtooth, square */}
      {(lfo.shape === 'triangle' || lfo.shape === 'sawtooth' || lfo.shape === 'square') && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-[10px] text-white/70">
                {lfo.shape === 'square' ? 'Pulse Width' : 'Symmetry'}
              </Label>
              <LfoParamModRow lfoId={id} param="symmetry" />
            </div>
            <span className="text-[10px] text-white/70 tabular-nums">{(lfo.symmetry ?? 0.5).toFixed(2)}</span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[lfo.symmetry ?? 0.5]}
            onValueChange={([v]) => setLfo(id, { symmetry: v })}
          />
        </div>
      )}

      {/* Strength */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-white/70">Strength</Label>
            <LfoParamModRow lfoId={id} param="strength" />
          </div>
          <span className="text-[10px] text-white/70 tabular-nums">{lfo.strength.toFixed(2)}</span>
        </div>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[lfo.strength]}
          onValueChange={([v]) => setLfo(id, { strength: v })}
        />
      </div>

      {/* Bipolar */}
      <div className="flex items-center justify-between py-0.5">
        <Label className="text-[10px] text-white/70">Bipolar</Label>
        <Switch
          checked={lfo.bipolar}
          onCheckedChange={(v) => setLfo(id, { bipolar: v })}
        />
      </div>

      {/* Speed mode */}
      <div className="space-y-1.5">
        <Label className="text-[10px] text-white/70">Speed</Label>
        <ButtonGroup>
          {(['bpm', 'hz'] as const).map((mode) => (
            <Button
              key={mode}
              size="xs"
              variant="outline"
              className={lfo.speedMode === mode
                ? 'bg-white/15 text-white border-white/20'
                : 'bg-black text-white/70 border-white/10 hover:bg-white/10 hover:text-white'}
              onClick={() => setLfo(id, { speedMode: mode })}
            >
              {mode.toUpperCase()}
            </Button>
          ))}
        </ButtonGroup>
      </div>

      {lfo.speedMode === 'hz' ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-white/70">Frequency (Hz)</Label>
            <LfoParamModRow lfoId={id} param="hz" />
          </div>
          <Input
            type="number"
            min={0.01}
            max={20}
            step={0.01}
            value={lfo.hz}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              if (!isNaN(v) && v > 0) setLfo(id, { hz: v })
            }}
            onKeyDown={(e) => e.stopPropagation()}
            className="h-7 text-xs"
          />
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label className="text-[10px] text-white/70">Divider</Label>
          <ButtonGroup>
            {DIVIDERS.map((d) => (
              <Button
                key={d.value}
                size="xs"
                variant="outline"
                className={lfo.divider === d.value
                  ? 'bg-white/15 text-white border-white/20'
                  : 'bg-black text-white/70 border-white/10 hover:bg-white/10 hover:text-white'}
                onClick={() => setLfo(id, { divider: d.value })}
              >
                {d.label}
              </Button>
            ))}
          </ButtonGroup>
        </div>
      )}
    </div>
  )
}

export function LfoPanel() {
  const [activeSlot, setActiveSlot] = useState<LfoSlotId>('lfo1')
  const showOverlay = useLfoStore((s) => s.showLfoOverlay)
  const toggleOverlay = useLfoStore((s) => s.toggleLfoOverlay)

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <ButtonGroup>
          {LFO_SLOT_IDS.map((id) => (
            <Button
              key={id}
              size="xs"
              variant="outline"
              className={activeSlot === id
                ? 'border-white/20'
                : 'bg-black text-white/50 border-white/10 hover:bg-white/10 hover:text-white'}
              style={activeSlot === id
                ? { backgroundColor: LFO_COLORS[id] + '30', color: LFO_COLORS[id], borderColor: LFO_COLORS[id] + '50' }
                : undefined}
              onClick={() => setActiveSlot(id)}
            >
              {LFO_LABELS[id]}
            </Button>
          ))}
        </ButtonGroup>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <Checkbox
            checked={showOverlay}
            onCheckedChange={() => toggleOverlay()}
            className="h-3.5 w-3.5"
          />
          <span className="text-[10px] text-white/60">Show</span>
        </label>
      </div>
      <LfoSlotEditor id={activeSlot} />
    </div>
  )
}
