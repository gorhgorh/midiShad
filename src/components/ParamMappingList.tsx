import { useAtomValue } from 'jotai'
import { callActionAtom } from '../atoms/moduleAtoms'
import { ParamRow } from './ParamRow'
import { OptionRow } from './OptionRow'
import { Button } from '@/components/ui/button'
import type { ParamDescriptor, OptionDescriptor, ActionDescriptor } from '../types'

interface ParamMappingListProps {
  params: ParamDescriptor[]
  options: OptionDescriptor[]
  actions: ActionDescriptor[]
}

export function ParamMappingList({ params, options, actions }: ParamMappingListProps) {
  const callAction = useAtomValue(callActionAtom)

  return (
    <div className="space-y-3">
      {params.length > 0 && (
        <div>
          {params.map((param) => (
            <ParamRow key={param.name} param={param} />
          ))}
        </div>
      )}
      {options.length > 0 && (
        <div>
          <h4 className="text-[10px] text-white/50 uppercase tracking-wide mb-1">Options</h4>
          {options.map((opt) => (
            <OptionRow key={opt.name} option={opt} />
          ))}
        </div>
      )}
      {actions.length > 0 && (
        <div>
          <h4 className="text-[10px] text-white/50 uppercase tracking-wide mb-1">Actions</h4>
          <div className="flex flex-wrap gap-1">
            {actions.map((action) => (
              <Button
                key={action.name}
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                onClick={() => callAction?.(action.methodName)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
