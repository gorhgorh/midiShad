import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LfoWavePreview } from './LfoWavePreview'
import { useLfoStore, LFO_SLOT_IDS, type LfoSlotId } from '@/store/lfoStore'
import type { LfoShape, Divider } from '@/lfo/engine'

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

function LfoSlotEditor({ id }: { id: LfoSlotId }) {
  const lfo = useLfoStore((s) => s.lfos[id])
  const setLfo = useLfoStore((s) => s.setLfo)
  const color = LFO_COLORS[id]

  return (
    <div className="space-y-3">
      <LfoWavePreview shape={lfo.shape} color={color} />

      {/* Shape selector */}
      <div className="space-y-1">
        <Label className="text-[10px] text-white/70">Shape</Label>
        <ToggleGroup
          type="single"
          value={lfo.shape}
          onValueChange={(v) => v && setLfo(id, { shape: v as LfoShape })}
          className="justify-start"
        >
          {SHAPES.map((s) => (
            <ToggleGroupItem key={s.value} value={s.value} className="h-6 px-2 text-[10px]">
              {s.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Strength */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] text-white/70">Strength</Label>
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
      <div className="flex items-center justify-between">
        <Label className="text-[10px] text-white/70">Bipolar</Label>
        <Switch
          checked={lfo.bipolar}
          onCheckedChange={(v) => setLfo(id, { bipolar: v })}
        />
      </div>

      {/* Speed mode */}
      <div className="space-y-1">
        <Label className="text-[10px] text-white/70">Speed</Label>
        <ToggleGroup
          type="single"
          value={lfo.speedMode}
          onValueChange={(v) => v && setLfo(id, { speedMode: v as 'bpm' | 'hz' })}
          className="justify-start"
        >
          <ToggleGroupItem value="bpm" className="h-6 px-2 text-[10px]">BPM</ToggleGroupItem>
          <ToggleGroupItem value="hz" className="h-6 px-2 text-[10px]">Hz</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {lfo.speedMode === 'hz' ? (
        <div className="space-y-1">
          <Label className="text-[10px] text-white/70">Frequency (Hz)</Label>
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
        <div className="space-y-1">
          <Label className="text-[10px] text-white/70">Divider</Label>
          <ToggleGroup
            type="single"
            value={String(lfo.divider)}
            onValueChange={(v) => v && setLfo(id, { divider: parseFloat(v) as Divider })}
            className="justify-start"
          >
            {DIVIDERS.map((d) => (
              <ToggleGroupItem key={d.value} value={String(d.value)} className="h-6 px-2 text-[10px]">
                {d.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}
    </div>
  )
}

export function LfoPanel() {
  return (
    <Tabs defaultValue="lfo1" className="w-full">
      <TabsList className="w-full h-7">
        {LFO_SLOT_IDS.map((id) => (
          <TabsTrigger
            key={id}
            value={id}
            className="text-[10px] h-5 px-2"
            style={{ color: LFO_COLORS[id] }}
          >
            {LFO_LABELS[id]}
          </TabsTrigger>
        ))}
      </TabsList>
      {LFO_SLOT_IDS.map((id) => (
        <TabsContent key={id} value={id} className="mt-2">
          <LfoSlotEditor id={id} />
        </TabsContent>
      ))}
    </Tabs>
  )
}
