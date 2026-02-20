import { createRootRoute, Outlet } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Settings, Component, AudioWaveform } from 'lucide-react'
import { ModuleRenderer } from '../components/ModuleRenderer'
import { ModuleInfoBar } from '../components/ModuleInfoBar'
import { ModuleControlsPanel } from '../components/ModuleControlsPanel'
import { AppSettingsDialog } from '../components/AppSettingsDialog'
import { LfoWindow } from '../components/LfoWindow'
import { useMidi } from '../midi/useMidi'
import { loadPersisted, setupPersistence } from '../store/persistence'
import { useModuleStore } from '../store/moduleStore'
import { useUiStore } from '../store/uiStore'
import '../nwwrld/register'
import { loadModules, toKebab } from '../nwwrld/loader'

const PANEL_STORAGE_KEY = 'midishad:panelOpen'
const LFO_PANEL_STORAGE_KEY = 'midishad:lfoPanelOpen'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const [loading, setLoading] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(() => {
    try { return localStorage.getItem(PANEL_STORAGE_KEY) !== 'false' } catch { return true }
  })
  const [lfoOpen, setLfoOpen] = useState(() => {
    try { return localStorage.getItem(LFO_PANEL_STORAGE_KEY) === 'true' } catch { return false }
  })
  const scale = useUiStore((s) => s.scale)

  // Apply data-ui-scale on <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-ui-scale', scale)
  }, [scale])

  // Load modules + persistence on mount
  const initRef = useRef(false)
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    ;(async () => {
      const mods = await loadModules()
      useModuleStore.getState().setModules(mods)
      loadPersisted()
      setupPersistence()

      // URL ?module= param: select module by kebab-case slug
      const params = new URLSearchParams(window.location.search)
      const moduleSlug = params.get('module')
      if (moduleSlug) {
        const match = mods.find((m) => toKebab(m.id) === moduleSlug)
        if (match) useModuleStore.getState().setActiveModule(match.id)
      }

      setLoading(false)
    })()
  }, [])

  useMidi()

  // Persist panel open state
  useEffect(() => {
    localStorage.setItem(PANEL_STORAGE_KEY, String(panelOpen))
  }, [panelOpen])

  useEffect(() => {
    localStorage.setItem(LFO_PANEL_STORAGE_KEY, String(lfoOpen))
  }, [lfoOpen])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'Tab') {
        e.preventDefault()
        setPanelOpen((prev) => !prev)
      }
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setSettingsOpen((prev) => !prev)
      }
      if (e.key === 'l' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setLfoOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        if (settingsOpen) setSettingsOpen(false)
      }
      if (e.key === 'f' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (document.fullscreenElement) {
          document.exitFullscreen()
        } else {
          document.documentElement.requestFullscreen()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settingsOpen])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-neutral-600 text-sm">
        Loading modules...
      </div>
    )
  }

  return (
    <>
      <ModuleRenderer />
      <ModuleInfoBar />
      <Outlet />

      {/* Top-right corner buttons (tablet-friendly) */}
      <div
        className="fixed top-3 right-3 flex gap-1.5"
        style={{ zIndex: 99998 }}
      >
        <button
          onClick={() => setLfoOpen((p) => !p)}
          style={{
            background: lfoOpen ? 'rgba(255,255,255,0.15)' : 'transparent',
            border: 'none',
            color: lfoOpen ? '#fff' : 'rgba(255,255,255,0.5)',
            width: 36,
            height: 36,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AudioWaveform size={20} />
        </button>
        <button
          onClick={() => setPanelOpen((p) => !p)}
          style={{
            background: panelOpen ? 'rgba(255,255,255,0.15)' : 'transparent',
            border: 'none',
            color: panelOpen ? '#fff' : 'rgba(255,255,255,0.5)',
            width: 36,
            height: 36,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Component size={20} />
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            width: 36,
            height: 36,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Settings size={20} />
        </button>
      </div>

      <LfoWindow visible={lfoOpen} />
      <ModuleControlsPanel visible={panelOpen} />
      <AppSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  )
}
