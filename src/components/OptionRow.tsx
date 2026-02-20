import type { OptionDescriptor } from '../types'
import { useModuleStore } from '../store/moduleStore'
import { useLfoStore, LFO_SLOT_IDS, type LfoSlotId } from '../store/lfoStore'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { IndexSlider } from './IndexSlider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const LFO_COLORS: Record<LfoSlotId, string> = {
  lfo1: '#6ee7b7',
  lfo2: '#93c5fd',
  lfo3: '#fca5a5',
  lfo4: '#fde68a',
}

interface OptionRowProps {
  option: OptionDescriptor
}

export function OptionRow({ option }: OptionRowProps) {
  const value = useModuleStore((s) => s.optionValues[option.name] ?? option.defaultVal)
  const setOptionValue = useModuleStore((s) => s.setOptionValue)
  const lfoAssignment = useLfoStore((s) => s.assignments[option.name] ?? null)
  const assignParam = useLfoStore((s) => s.assignParam)

  // Options with values array: use IndexSlider for MIDI-mappability
  if (option.values && option.values.length > 0 && option.type === 'select') {
    const currentIndex = option.values.indexOf(String(value))
    return (
      <div className="flex items-center gap-1.5 py-1">
        <label className="w-[80px] shrink-0 text-xs text-white/70 truncate" title={option.label}>
          {option.label}
        </label>
        <IndexSlider
          values={option.values}
          index={currentIndex >= 0 ? currentIndex : 0}
          onChange={(idx) => setOptionValue(option.name, option.values![idx])}
        />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 py-1">
      <label className="w-[80px] shrink-0 text-xs text-white/70 truncate" title={option.label}>
        {option.label}
      </label>

      {option.type === 'color' && (
        <input
          type="color"
          value={String(value)}
          onChange={(e) => setOptionValue(option.name, e.target.value)}
          className="w-8 h-6 border border-border rounded cursor-pointer bg-transparent"
        />
      )}

      {option.type === 'boolean' && (
        <>
          <Switch
            checked={!!value}
            onCheckedChange={(v) => setOptionValue(option.name, v)}
          />
          <Select
            value={lfoAssignment ?? '__none__'}
            onValueChange={(v) => assignParam(option.name, v === '__none__' ? null : v as LfoSlotId)}
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
        </>
      )}

      {(option.type === 'text' || option.type === 'assetFile' || option.type === 'assetDir') && (
        <Input
          type="text"
          value={String(value)}
          onChange={(e) => setOptionValue(option.name, e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          className="h-6 text-xs flex-1"
        />
      )}
    </div>
  )
}
