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

  return (
    <div
      className="ui-chrome fixed bottom-3 left-0 right-0 flex justify-between items-end px-4 z-5 pointer-events-none transition-opacity"
      style={{
        opacity: visible ? 1 : 0,
        transitionDuration: `${config.infoFadeDuration}s`,
      }}
    >
      {activeModule ? (
        <span className="text-xs text-white/70">{activeModule.name}</span>
      ) : <span />}

      {activeModule?.category ? (
        <span className="text-[11px] text-white bg-black/75 px-2.5 py-0.5 rounded-md">
          {activeModule.category}
        </span>
      ) : <span />}
    </div>
  )
}
