import { createRootRoute, Outlet } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { ModuleRenderer } from '../components/ModuleRenderer'
import { ModuleInfoBar } from '../components/ModuleInfoBar'
import { ModuleControlsPanel } from '../components/ModuleControlsPanel'
import { AppSettingsDialog } from '../components/AppSettingsDialog'
import { useMidi } from '../midi/useMidi'
import { loadPersisted, setupPersistence } from '../store/persistence'
import { useModuleStore } from '../store/moduleStore'
import '../nwwrld/register'
import { loadModules } from '../nwwrld/loader'

const PANEL_STORAGE_KEY = 'midishad:panelOpen'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const [loading, setLoading] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(() => {
    try { return localStorage.getItem(PANEL_STORAGE_KEY) !== 'false' } catch { return true }
  })

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
      setLoading(false)
    })()
  }, [])

  useMidi()

  // Persist panel open state
  useEffect(() => {
    localStorage.setItem(PANEL_STORAGE_KEY, String(panelOpen))
  }, [panelOpen])

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
      <ModuleControlsPanel visible={panelOpen} />
      <AppSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  )
}
