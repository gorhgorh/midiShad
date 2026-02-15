import { createRootRoute, Outlet, useNavigate, useLocation } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { ShaderCanvas } from '../components/ShaderCanvas'
import { useMidi } from '../midi/useMidi'
import { loadPersisted, setupPersistence } from '../store/persistence'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const isConfig = location.pathname === '/config'

  const persistRef = useRef(false)
  useEffect(() => {
    if (!persistRef.current) {
      persistRef.current = true
      loadPersisted()
      setupPersistence()
    }
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

  return (
    <>
      <ShaderCanvas />
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
