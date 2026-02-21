import { FloatingPanel } from './FloatingPanel'
import { ParamMappingList } from './ParamMappingList'
import { useModuleStore } from '@/store/moduleStore'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronRight, GripVertical, RouteOff } from 'lucide-react'
import { useState, useCallback } from 'react'
import { ConfigPanelContext } from './ParamConfigPanel'

interface ModuleControlsPanelProps {
  visible: boolean
}

function SectionHeader({ label, open, onToggle, onReset }: { label: string; open: boolean; onToggle: () => void; onReset?: () => void }) {
  return (
    <div className="flex items-center border-b border-white/10 mb-2">
      <CollapsibleTrigger
        onClick={onToggle}
        className="flex flex-1 items-center gap-1.5 py-2.5 text-xs font-medium text-white/70 uppercase tracking-wide hover:text-white transition-colors cursor-pointer"
      >
        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
        {label}
      </CollapsibleTrigger>
      {onReset && (
        <button
          onClick={(e) => { e.stopPropagation(); onReset() }}
          className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors cursor-pointer"
          title={`Reset ${label}`}
        >
          <RouteOff className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

export function ModuleControlsPanel({ visible }: ModuleControlsPanelProps) {
  const activeModule = useModuleStore((s) => s.activeModule)
  const [moduleOpen, setModuleOpen] = useState(true)
  const [transformOpen, setTransformOpen] = useState(true)
  const [openParam, setOpenParam] = useState<string | null>(null)
  const toggle = useCallback((name: string) => {
    setOpenParam(prev => prev === name ? null : name)
  }, [])
  const close = useCallback(() => setOpenParam(null), [])

  const resetModule = useModuleStore((s) => s.resetModuleParams)

  const moduleParams = activeModule?.params.filter((p) => p.group !== 'base') ?? []
  const baseParams = activeModule?.params.filter((p) => p.group === 'base') ?? []
  const moduleActions = activeModule?.actions.filter((a) => a.group !== 'base') ?? []
  const baseActions = activeModule?.actions.filter((a) => a.group === 'base') ?? []

  return (
    <FloatingPanel visible={visible}>
      {/* Drag handle header */}
      <div
        data-drag-handle
        className="flex items-center gap-1.5 py-2.5 -mx-2 px-2 border-b border-border cursor-grab active:cursor-grabbing select-none"
      >
        <GripVertical className="h-3.5 w-3.5 text-white/30 shrink-0" />
        <span className="flex-1 min-w-0 text-white text-xs font-medium truncate text-center">
          {activeModule ? `${activeModule.name} — ${activeModule.category}` : 'No module'}
        </span>
      </div>

      <ConfigPanelContext.Provider value={{ openParam, toggle, close }}>
      <div className="pt-4 space-y-4 px-1">
        {/* Module params section */}
        {(moduleParams.length > 0 || activeModule?.options.length || moduleActions.length > 0) && (
          <Collapsible open={moduleOpen} onOpenChange={setModuleOpen}>
            <SectionHeader label="Module" open={moduleOpen} onToggle={() => setModuleOpen(!moduleOpen)} onReset={resetModule} />
            <CollapsibleContent className="pt-3 px-0.5">
              <ParamMappingList
                params={moduleParams}
                options={activeModule?.options ?? []}
                actions={moduleActions}
              />
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Transform section */}
        {(baseParams.length > 0 || baseActions.length > 0) && (
          <Collapsible open={transformOpen} onOpenChange={setTransformOpen}>
            <SectionHeader label="Transform" open={transformOpen} onToggle={() => setTransformOpen(!transformOpen)} />
            <CollapsibleContent className="pt-3 px-0.5">
              <ParamMappingList
                params={baseParams}
                options={[]}
                actions={baseActions}
              />
            </CollapsibleContent>
          </Collapsible>
        )}

      </div>
      </ConfigPanelContext.Provider>
    </FloatingPanel>
  )
}
