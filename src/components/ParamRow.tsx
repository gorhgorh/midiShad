import { useMemo } from 'react'
import { AnimatePresence } from 'motion/react'
import { useAtomValue, useSetAtom } from 'jotai'
import { selectAtom } from 'jotai/utils'
import type { ParamDescriptor } from '../types'
import { paramValuesAtom, setParamValueAtom } from '../atoms/moduleAtoms'
import { selectedDeviceIdAtom, mappingsAtom } from '../atoms/midiAtoms'
import { assignmentsAtom, baseValuesAtom, setBaseValueAtom } from '../atoms/lfoAtoms'
import { useModulatedParam } from '../render/useModulatedValue'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'
import { ParamConfigPanel, useConfigPanel, LFO_COLORS } from './ParamConfigPanel'

interface ParamRowProps {
  param: ParamDescriptor
}

export function ParamRow({ param }: ParamRowProps) {
  // Use selectAtom for targeted subscriptions (avoid re-render on unrelated changes)
  const paramValueAtom = useMemo(
    () => selectAtom(paramValuesAtom, (vals) => vals[param.name] ?? param.default),
    [param.name, param.default]
  )
  const storeValue = useAtomValue(paramValueAtom)
  const _setParamValue = useSetAtom(setParamValueAtom)

  const lfoAssignmentAtom = useMemo(
    () => selectAtom(assignmentsAtom, (assigns) => assigns[param.name] ?? null),
    [param.name]
  )
  const lfoAssignment = useAtomValue(lfoAssignmentAtom)

  const _setBaseValue = useSetAtom(setBaseValueAtom)
  const baseValueAtom = useMemo(
    () => selectAtom(baseValuesAtom, (vals) => vals[param.name] ?? param.default),
    [param.name, param.default]
  )
  const baseValue = useAtomValue(baseValueAtom)

  const selectedDeviceId = useAtomValue(selectedDeviceIdAtom)
  const mappings = useAtomValue(mappingsAtom)
  const hasCc = selectedDeviceId ? mappings[selectedDeviceId]?.[param.name] != null : false

  // Low-freq (~10fps) read from renderState for display only
  const modulatedValue = useModulatedParam(param.name, storeValue)

  const { openParam, toggle, close } = useConfigPanel()
  const isConfigOpen = openParam === param.name

  // Slider always shows base value (user-controlled), not modulated
  const sliderValue = lfoAssignment ? baseValue : storeValue

  function onSliderChange([v]: number[]) {
    _setParamValue({ name: param.name, value: v })
    _setBaseValue({ paramName: param.name, value: v })
  }

  const gearColor = lfoAssignment
    ? LFO_COLORS[lfoAssignment as keyof typeof LFO_COLORS]
    : hasCc
      ? 'rgba(255,255,255,0.7)'
      : undefined

  return (
    <div className="relative">
      <div className="flex items-center gap-2 py-1.5">
        <label className="w-[90px] shrink-0 text-xs text-white/70 truncate" title={param.label}>
          {param.label}
        </label>
        <Slider
          min={param.min}
          max={param.max}
          step={(param.max - param.min) / 200}
          value={[sliderValue]}
          onValueChange={onSliderChange}
          className="flex-1"
        />
        <span
          className="w-[42px] text-[10px] text-right tabular-nums"
          style={lfoAssignment ? { color: LFO_COLORS[lfoAssignment as keyof typeof LFO_COLORS] } : { color: 'rgba(255,255,255,0.7)' }}
          title={lfoAssignment ? `Base: ${baseValue.toFixed(1)}` : undefined}
        >
          {modulatedValue.toFixed(1)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 shrink-0"
          style={gearColor ? { color: gearColor } : { color: 'rgba(255,255,255,0.3)' }}
          onClick={() => toggle(param.name)}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </div>
      <AnimatePresence>
        {isConfigOpen && (
          <ParamConfigPanel
            key={param.name}
            paramName={param.name}
            showCc
            onClose={close}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
