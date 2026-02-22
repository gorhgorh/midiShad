import { createRootRoute, Outlet, useLocation } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useAtomValue } from 'jotai'
import { Settings, Component, AudioWaveform, Activity, Save, MonitorPlay, EthernetPort } from 'lucide-react'
import { ModuleRenderer } from '../components/ModuleRenderer'
import { ModuleInfoBar } from '../components/ModuleInfoBar'
import { ModuleControlsPanel } from '../components/ModuleControlsPanel'
import { AppSettingsDialog } from '../components/AppSettingsDialog'
import { LfoWindow } from '../components/LfoWindow'
import { ModuleSelector } from '../components/ModuleSelector'
import { CcMonitor } from '../components/CcMonitor'
import { FpsMeter } from '../components/FpsMeter'
import { MidiDebugPanel } from '../components/MidiDebugPanel'
import { useMidi } from '../midi/useMidi'
import { useServerMidi } from '../midi/useServerMidi'
import { loadPersisted, saveAll, flushCcToStore } from '../atoms/persistence'
import { appStore } from '../atoms/store'
import { setModulesAtom, setActiveModuleAtom } from '../atoms/moduleAtoms'
import { selectedDeviceIdAtom } from '../atoms/midiAtoms'
import { setDebugEnabled } from '../atoms/midiDebugAtoms'
import { scaleAtom } from '../atoms/uiAtoms'
import '../nwwrld/register'
import { loadModules, toKebab } from '../nwwrld/loader'

const PANEL_STORAGE_KEY = 'midishad:panelOpen'
const LFO_PANEL_STORAGE_KEY = 'midishad:lfoPanelOpen'
const CC_MONITOR_STORAGE_KEY = 'midishad:ccMonitorOpen'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const location = useLocation()
  const isModulePage = !location.pathname.startsWith('/srvr')

  const [loading, setLoading] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(() => {
    try { return localStorage.getItem(PANEL_STORAGE_KEY) !== 'false' } catch { return true }
  })
  const [lfoOpen, setLfoOpen] = useState(() => {
    try { return localStorage.getItem(LFO_PANEL_STORAGE_KEY) === 'true' } catch { return false }
  })
  const [ccMonitorOpen, setCcMonitorOpen] = useState(() => {
    try { return localStorage.getItem(CC_MONITOR_STORAGE_KEY) === 'true' } catch { return false }
  })
  const [fpsVisible, setFpsVisible] = useState(false)
  const [midiDebugOpen, setMidiDebugOpen] = useState(false)
  const [saveFlash, setSaveFlash] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const hasMidi = !!useAtomValue(selectedDeviceIdAtom)
  const scale = useAtomValue(scaleAtom)

  // Track fullscreen state
  useEffect(() => {
    function onChange() { setIsFullscreen(!!document.fullscreenElement) }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // Apply data-ui-scale on <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-ui-scale', scale)
  }, [scale])

  // Load modules + persistence on mount (only for module pages)
  const initRef = useRef(false)
  useEffect(() => {
    if (!isModulePage) {
      setLoading(false)
      return
    }
    if (initRef.current) return
    initRef.current = true
    ;(async () => {
      const mods = await loadModules()
      appStore.set(setModulesAtom, mods)
      loadPersisted()

      // URL ?module= param: select module by kebab-case slug
      const params = new URLSearchParams(window.location.search)
      const moduleSlug = params.get('module')
      if (moduleSlug) {
        const match = mods.find((m) => toKebab(m.id) === moduleSlug)
        if (match) appStore.set(setActiveModuleAtom, match.id)
      }

      setLoading(false)
    })()
  }, [isModulePage])

  useMidi()
  useServerMidi()

  // Persist panel open state
  useEffect(() => {
    localStorage.setItem(PANEL_STORAGE_KEY, String(panelOpen))
  }, [panelOpen])

  useEffect(() => {
    localStorage.setItem(LFO_PANEL_STORAGE_KEY, String(lfoOpen))
  }, [lfoOpen])

  useEffect(() => {
    localStorage.setItem(CC_MONITOR_STORAGE_KEY, String(ccMonitorOpen))
  }, [ccMonitorOpen])

  // Sync debug panel visibility to skip expensive logging when hidden
  useEffect(() => {
    setDebugEnabled(midiDebugOpen)
  }, [midiDebugOpen])

  const doSave = () => {
    flushCcToStore()
    saveAll()
    setSaveFlash(true)
    setTimeout(() => setSaveFlash(false), 500)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        doSave()
        return
      }

      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      // Fullscreen toggle always available
      if (e.key === 'f' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (document.fullscreenElement) {
          document.exitFullscreen()
        } else {
          document.documentElement.requestFullscreen()
        }
        return
      }

      // In fullscreen, suppress all other panel shortcuts
      if (isFullscreen) return

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
      if (e.key === 'm' && !e.metaKey && !e.ctrlKey && !e.altKey && hasMidi) {
        setCcMonitorOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        if (settingsOpen) setSettingsOpen(false)
      }
      if (e.key === 'p' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setFpsVisible((prev) => !prev)
      }
      if (e.key === 'd' && !e.metaKey && !e.ctrlKey && !e.altKey && hasMidi) {
        setMidiDebugOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settingsOpen, isFullscreen, hasMidi])

  // Save on beforeunload
  useEffect(() => {
    function onBeforeUnload() {
      flushCcToStore()
      saveAll()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  // Non-module pages (like /srvr) render just the Outlet
  if (!isModulePage) {
    return <Outlet />
  }

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
      {!isFullscreen && <ModuleInfoBar />}
      <Outlet />

      {/* Top-right corner buttons — hidden in fullscreen */}
      {!isFullscreen && (
        <div
          className="fixed top-3 right-3 flex gap-1.5"
          style={{ zIndex: 99998 }}
        >
          <button
            onClick={doSave}
            style={{
              background: 'transparent',
              border: 'none',
              color: saveFlash ? '#4ade80' : 'rgba(255,255,255,0.5)',
              width: 36,
              height: 36,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s',
            }}
            title="Save (Cmd+S)"
          >
            <Save size={20} />
          </button>
          {hasMidi && (
            <button
              onClick={() => setMidiDebugOpen((p) => !p)}
              style={{
                background: midiDebugOpen ? 'rgba(255,255,255,0.15)' : 'transparent',
                border: 'none',
                color: midiDebugOpen ? '#fff' : 'rgba(255,255,255,0.5)',
                width: 36,
                height: 36,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="MIDI Debug (d)"
            >
              <EthernetPort size={20} />
            </button>
          )}
          <button
            onClick={() => setFpsVisible((p) => !p)}
            style={{
              background: fpsVisible ? 'rgba(255,255,255,0.15)' : 'transparent',
              border: 'none',
              color: fpsVisible ? '#fff' : 'rgba(255,255,255,0.5)',
              width: 36,
              height: 36,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="FPS Meter (p)"
          >
            <MonitorPlay size={20} />
          </button>
          {hasMidi && (
            <button
              onClick={() => setCcMonitorOpen((p) => !p)}
              style={{
                background: ccMonitorOpen ? 'rgba(255,255,255,0.15)' : 'transparent',
                border: 'none',
                color: ccMonitorOpen ? '#fff' : 'rgba(255,255,255,0.5)',
                width: 36,
                height: 36,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="CC Monitor (m)"
            >
              <Activity size={20} />
            </button>
          )}
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
      )}

      <ModuleSelector />
      {!isFullscreen && hasMidi && <CcMonitor visible={ccMonitorOpen} />}
      {!isFullscreen && <LfoWindow visible={lfoOpen} />}
      {!isFullscreen && <ModuleControlsPanel visible={panelOpen} />}
      {!isFullscreen && <AppSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />}
      {!isFullscreen && hasMidi && <MidiDebugPanel visible={midiDebugOpen} />}
      {!isFullscreen && <FpsMeter visible={fpsVisible} />}
    </>
  )
}
