import { FloatingPanel } from './FloatingPanel'
import { ParamMappingList } from './ParamMappingList'
import { LfoPanel } from './LfoPanel'
import { useModuleStore } from '@/store/moduleStore'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronLeft, ChevronRight, GripVertical, List } from 'lucide-react'
import { useState, useMemo } from 'react'

interface ModuleControlsPanelProps {
  visible: boolean
}

function SectionHeader({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <CollapsibleTrigger
      onClick={onToggle}
      className="flex w-full items-center gap-1.5 py-2.5 text-xs font-medium text-white/70 uppercase tracking-wide hover:text-white transition-colors cursor-pointer border-b border-white/10 mb-2"
    >
      <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
      {label}
    </CollapsibleTrigger>
  )
}

export function ModuleControlsPanel({ visible }: ModuleControlsPanelProps) {
  const modules = useModuleStore((s) => s.modules)
  const activeModule = useModuleStore((s) => s.activeModule)
  const setActiveModule = useModuleStore((s) => s.setActiveModule)
  const [moduleOpen, setModuleOpen] = useState(true)
  const [transformOpen, setTransformOpen] = useState(true)
  const [lfoOpen, setLfoOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)

  // Flat list for prev/next cycling
  const flatModules = useMemo(() => modules, [modules])
  const activeIndex = flatModules.findIndex((m) => m.id === activeModule?.id)

  function cycleModule(dir: -1 | 1) {
    if (flatModules.length === 0) return
    const next = (activeIndex + dir + flatModules.length) % flatModules.length
    setActiveModule(flatModules[next].id)
  }

  // Group modules by category for popover list
  const byCategory = new Map<string, typeof modules>()
  for (const m of modules) {
    const list = byCategory.get(m.category) ?? []
    list.push(m)
    byCategory.set(m.category, list)
  }

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
        <button
          onClick={(e) => { e.stopPropagation(); cycleModule(-1) }}
          className="shrink-0 p-0.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="flex-1 min-w-0 text-white text-xs font-medium truncate text-center">
          {activeModule ? `${activeModule.name} — ${activeModule.category}` : 'No module'}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); cycleModule(1) }}
          className="shrink-0 p-0.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <Popover open={listOpen} onOpenChange={setListOpen}>
          <PopoverTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 p-0.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0 bg-black/95 border-border max-h-[60vh] overflow-y-auto" align="end">
            {[...byCategory.entries()].map(([cat, mods], catIdx) => (
              <div key={cat}>
                {catIdx > 0 && <div className="border-b border-white/10" />}
                <div className="text-white/40 text-[10px] uppercase tracking-wide px-3 pt-2 pb-1">{cat}</div>
                {mods.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => { setActiveModule(m.id); setListOpen(false) }}
                    className={`py-2 px-3 text-xs cursor-pointer rounded mx-1 ${
                      m.id === activeModule?.id ? 'text-white bg-white/10' : 'text-white hover:bg-white/10'
                    }`}
                  >
                    {m.name}
                  </div>
                ))}
              </div>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      <div className="pt-4 space-y-4 px-1">
        {/* Module params section */}
        {(moduleParams.length > 0 || activeModule?.options.length || moduleActions.length > 0) && (
          <Collapsible open={moduleOpen} onOpenChange={setModuleOpen}>
            <SectionHeader label="Module" open={moduleOpen} onToggle={() => setModuleOpen(!moduleOpen)} />
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

        {/* LFO section */}
        <Collapsible open={lfoOpen} onOpenChange={setLfoOpen}>
          <SectionHeader label="LFO" open={lfoOpen} onToggle={() => setLfoOpen(!lfoOpen)} />
          <CollapsibleContent className="pt-3 px-0.5">
            <LfoPanel />
          </CollapsibleContent>
        </Collapsible>
      </div>
    </FloatingPanel>
  )
}
