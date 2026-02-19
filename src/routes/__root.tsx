import { createRootRoute, Outlet, useNavigate, useLocation } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { ModuleRenderer } from '../components/ModuleRenderer'
import { ModuleInfoBar } from '../components/ModuleInfoBar'
import { useMidi } from '../midi/useMidi'
import { loadPersisted, setupPersistence } from '../store/persistence'
import { useModuleStore } from '../store/moduleStore'
import '../nwwrld/register'
import { loadModules } from '../nwwrld/loader'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const isConfig = location.pathname === '/config'
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        navigate({ to: isConfig ? '/' : '/config' })
      }
      if (e.key === 'Escape' && isConfig) {
        navigate({ to: '/' })
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
  }, [isConfig, navigate])

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: 14 }}>
        Loading modules...
      </div>
    )
  }

  return (
    <>
      <ModuleRenderer />
      <ModuleInfoBar />
      <Outlet />
      {!isConfig && (
        <button
          onClick={() => navigate({ to: '/config' })}
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 20,
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: 13,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
          }}
        >
          Config (c)
        </button>
      )}
    </>
  )
}
