import type { OptionDescriptor } from '../types'
import { useModuleStore } from '../store/moduleStore'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { IndexSlider } from './IndexSlider'

interface OptionRowProps {
  option: OptionDescriptor
}

export function OptionRow({ option }: OptionRowProps) {
  const value = useModuleStore((s) => s.optionValues[option.name] ?? option.defaultVal)
  const setOptionValue = useModuleStore((s) => s.setOptionValue)

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
      <label className="w-[80px] shrink-0 text-xs text-muted-foreground truncate" title={option.label}>
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
        <Switch
          checked={!!value}
          onCheckedChange={(v) => setOptionValue(option.name, v)}
        />
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
