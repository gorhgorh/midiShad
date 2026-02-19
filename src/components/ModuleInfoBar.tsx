import { useEffect, useRef, useState } from 'react'
import { useModuleStore } from '../store/moduleStore'
import { config } from '../config'

export function ModuleInfoBar() {
  const activeModule = useModuleStore((s) => s.activeModule)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    function onMouseMove() {
      setVisible(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setVisible(false), config.infoFadeTimeout * 1000)
    }

    window.addEventListener('mousemove', onMouseMove)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const transition = `opacity ${config.infoFadeDuration}s ease`

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 12,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        padding: '0 16px',
        zIndex: 5,
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition,
      }}
    >
      {activeModule ? (
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
          {activeModule.name}
        </span>
      ) : <span />}

      {activeModule?.category ? (
        <span
          style={{
            fontSize: 11,
            color: '#fff',
            background: 'rgba(0,0,0,0.75)',
            padding: '3px 10px',
            borderRadius: 6,
          }}
        >
          {activeModule.category}
        </span>
      ) : <span />}
    </div>
  )
}
