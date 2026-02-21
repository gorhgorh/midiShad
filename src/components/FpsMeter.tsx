import { useRef, useEffect } from 'react'

interface FpsMeterProps {
  visible: boolean
}

export function FpsMeter({ visible }: FpsMeterProps) {
  const ref = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!visible) return
    const el = ref.current
    if (!el) return

    let frames = 0
    let last = performance.now()

    function tick() {
      frames++
      const now = performance.now()
      if (now - last >= 500) {
        const fps = Math.round((frames * 1000) / (now - last))
        if (el) el.textContent = `${fps} fps`
        frames = 0
        last = now
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [visible])

  if (!visible) return null

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        bottom: 8,
        right: 8,
        zIndex: 99999,
        color: '#6ee7b7',
        background: 'rgba(0,0,0,0.6)',
        padding: '2px 6px',
        borderRadius: 4,
        fontSize: 11,
        fontFamily: 'monospace',
        pointerEvents: 'none',
      }}
    >
      -- fps
    </div>
  )
}
