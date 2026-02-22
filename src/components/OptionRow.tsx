import { useMemo } from 'react'
import { AnimatePresence } from 'motion/react'
import { useAtomValue, useSetAtom } from 'jotai'
import { selectAtom } from 'jotai/utils'
import type { OptionDescriptor } from '../types'
import { optionValuesAtom, setOptionValueAtom } from '../atoms/moduleAtoms'
import { assignmentsAtom } from '../atoms/lfoAtoms'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { IndexSlider } from './IndexSlider'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'
import { ParamConfigPanel, useConfigPanel, LFO_COLORS } from './ParamConfigPanel'

interface OptionRowProps {
  option: OptionDescriptor
}

export function OptionRow({ option }: OptionRowProps) {
  // Use selectAtom for targeted subscriptions
  const optionValueAtom = useMemo(
    () => selectAtom(optionValuesAtom, (vals) => vals[option.name] ?? option.defaultVal),
    [option.name, option.defaultVal]
  )
  const value = useAtomValue(optionValueAtom)
  const _setOptionValue = useSetAtom(setOptionValueAtom)

  const lfoAssignmentAtom = useMemo(
    () => selectAtom(assignmentsAtom, (assigns) => assigns[option.name] ?? null),
    [option.name]
  )
  const lfoAssignment = useAtomValue(lfoAssignmentAtom)

  const { openParam, toggle, close } = useConfigPanel()
  const isConfigOpen = openParam === option.name

  const setOptionValue = (name: string, val: unknown) => _setOptionValue({ name, value: val })

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
    <div className="relative">
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
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 shrink-0"
              style={lfoAssignment ? { color: LFO_COLORS[lfoAssignment as keyof typeof LFO_COLORS] } : { color: 'rgba(255,255,255,0.3)' }}
              onClick={() => toggle(option.name)}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
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
      {option.type === 'boolean' && (
        <AnimatePresence>
          {isConfigOpen && (
            <ParamConfigPanel
              key={option.name}
              paramName={option.name}
              showCc={false}
              onClose={close}
            />
          )}
        </AnimatePresence>
      )}
    </div>
  )
}
