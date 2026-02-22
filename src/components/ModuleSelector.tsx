import { useState, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronLeft, ChevronRight, RouteOff } from 'lucide-react'
import { useAtomValue, useSetAtom } from 'jotai'
import { modulesAtom, activeModuleAtom, setActiveModuleAtom, resetModuleParamsAtom } from '@/atoms/moduleAtoms'
import { resetAllLfosAtom } from '@/atoms/lfoAtoms'

export function ModuleSelector() {
  const modules = useAtomValue(modulesAtom)
  const activeModule = useAtomValue(activeModuleAtom)
  const setActiveModule = useSetAtom(setActiveModuleAtom)
  const resetModule = useSetAtom(resetModuleParamsAtom)
  const resetAllLfos = useSetAtom(resetAllLfosAtom)
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flatModules = useMemo(() => modules, [modules])
  const activeIndex = flatModules.findIndex((m) => m.id === activeModule?.id)

  function cycleModule(dir: -1 | 1) {
    if (flatModules.length === 0) return
    const next = (activeIndex + dir + flatModules.length) % flatModules.length
    setActiveModule(flatModules[next].id)
  }

  const resetAll = useCallback(() => {
    resetModule()
    resetAllLfos()
  }, [resetModule, resetAllLfos])

  const byCategory = useMemo(() => {
    const map = new Map<string, typeof modules>()
    for (const m of modules) {
      const list = map.get(m.category) ?? []
      list.push(m)
      map.set(m.category, list)
    }
    return map
  }, [modules])

  const enter = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
    setOpen(true)
  }
  const leave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  return (
    <div className="fixed top-0 left-0" style={{ zIndex: 99998 }}>
      {/* Docked top-left bar */}
      <div
        className="flex items-center gap-1 bg-black/85 backdrop-blur-md border-b border-r border-border rounded-br-lg px-2 py-1.5"
        onMouseEnter={enter}
        onMouseLeave={leave}
      >
        <button
          onClick={() => cycleModule(-1)}
          className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <AnimatePresence mode="wait">
          <motion.span
            key={activeModule?.id ?? 'none'}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="text-white text-xs font-medium truncate max-w-[160px] px-1"
          >
            {activeModule?.name ?? 'No module'}
          </motion.span>
        </AnimatePresence>
        <button
          onClick={() => cycleModule(1)}
          className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Dropdown menu — slides down from above */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="bg-black/90 backdrop-blur-md border border-t-0 border-border rounded-b-lg overflow-hidden"
            style={{ width: 240 }}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            onMouseEnter={enter}
            onMouseLeave={leave}
          >
            <div className="p-3">
              {/* Header */}
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-white/40 text-[10px] uppercase tracking-wide">Module</span>
                <div className="flex-1" />
                <button
                  onClick={resetAll}
                  className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors cursor-pointer"
                  title="Reset all (params + LFOs)"
                >
                  <RouteOff className="h-3 w-3" />
                </button>
              </div>

              {/* Module list */}
              <div className="max-h-[60vh] overflow-y-auto -mr-1 pr-1">
                {[...byCategory.entries()].map(([cat, mods], catIdx) => (
                  <div key={cat}>
                    {catIdx > 0 && <div className="border-b border-white/10 my-1" />}
                    <div className="text-white/40 text-[10px] uppercase tracking-wide py-1">{cat}</div>
                    {mods.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => setActiveModule(m.id)}
                        className={`py-1.5 px-2 text-xs cursor-pointer rounded ${
                          m.id === activeModule?.id ? 'text-white bg-white/10' : 'text-white/60 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {m.name}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
