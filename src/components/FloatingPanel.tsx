import { useRef, useCallback, useState, type ReactNode } from 'react'

interface FloatingPanelProps {
  children: ReactNode
  visible: boolean
  storageKey?: string
  defaultPosition?: { x: number; y: number }
}

function loadPosition(key: string, fallback: { x: number; y: number }): { x: number; y: number } {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return fallback
}

function savePosition(key: string, x: number, y: number) {
  localStorage.setItem(key, JSON.stringify({ x, y }))
}

export function FloatingPanel({ children, visible, storageKey = 'midishad:panelPos', defaultPosition }: FloatingPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(() =>
    loadPosition(storageKey, defaultPosition ?? { x: window.innerWidth - 380, y: 60 })
  )
  const dragging = useRef(false)
  const offset = useRef({ x: 0, y: 0 })
  const lastPos = useRef({ x: 0, y: 0 })

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // Only drag from the header area
    if (!(e.target as HTMLElement).closest('[data-drag-handle]')) return
    e.preventDefault()
    dragging.current = true
    const rect = panelRef.current!.getBoundingClientRect()
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    lastPos.current = { x: rect.left, y: rect.top }

    function onMouseMove(ev: MouseEvent) {
      if (!dragging.current || !panelRef.current) return
      const x = Math.max(0, Math.min(window.innerWidth - 100, ev.clientX - offset.current.x))
      const y = Math.max(0, Math.min(window.innerHeight - 50, ev.clientY - offset.current.y))
      panelRef.current.style.left = `${x}px`
      panelRef.current.style.top = `${y}px`
      lastPos.current = { x, y }
    }

    function onMouseUp() {
      dragging.current = false
      setPosition(lastPos.current)
      savePosition(storageKey, lastPos.current.x, lastPos.current.y)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [])

  if (!visible) return null

  return (
    <div
      ref={panelRef}
      onMouseDown={onMouseDown}
      className="ui-chrome fixed z-50 w-[360px] max-h-[80vh] overflow-y-auto rounded-lg border border-border bg-black/85 backdrop-blur-md shadow-xl p-5"
      style={{ left: position.x, top: position.y }}
    >
      {children}
    </div>
  )
}
