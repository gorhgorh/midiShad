import { AnimatePresence } from 'motion/react'
import type { ParamDescriptor } from '../types'
import { useModuleStore } from '../store/moduleStore'
import { useMidiStore } from '../store/midiStore'
import { useLfoStore } from '../store/lfoStore'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'
import { ParamConfigPanel, useConfigPanel, LFO_COLORS } from './ParamConfigPanel'

interface ParamRowProps {
  param: ParamDescriptor
}

export function ParamRow({ param }: ParamRowProps) {
  const modulatedValue = useModuleStore((s) => s.paramValues[param.name] ?? param.default)
  const setParamValue = useModuleStore((s) => s.setParamValue)
  const lfoAssignment = useLfoStore((s) => s.assignments[param.name] ?? null)
  const setBaseValue = useLfoStore((s) => s.setBaseValue)
  const baseValue = useLfoStore((s) => s.baseValues[param.name] ?? param.default)
  const hasCcMapping = useMidiStore((s) => {
    const deviceId = s.selectedDeviceId
    if (!deviceId) return false
    return s.mappings[deviceId]?.[param.name] != null
  })

  const { openParam, toggle, close } = useConfigPanel()
  const isConfigOpen = openParam === param.name

  const value = lfoAssignment ? baseValue : modulatedValue

  function onSliderChange([v]: number[]) {
    setParamValue(param.name, v)
    setBaseValue(param.name, v)
  }

  const gearColor = lfoAssignment
    ? LFO_COLORS[lfoAssignment]
    : hasCcMapping
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
          value={[value]}
          onValueChange={onSliderChange}
          className="flex-1"
        />
        <span
          className="w-[42px] text-[10px] text-right tabular-nums"
          style={lfoAssignment ? { color: LFO_COLORS[lfoAssignment] } : { color: 'rgba(255,255,255,0.7)' }}
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
