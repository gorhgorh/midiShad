import { useRef, useEffect } from 'react'
import { create } from 'zustand'
import { motion, AnimatePresence } from 'motion/react'

interface MidiLogEntry {
  id: number
  label: string
}

let _nextId = 0
const MAX_LOG = 500

export const useMidiDebugStore = create<{
  messages: MidiLogEntry[]
  push: (raw: number[]) => void
}>((set) => ({
  messages: [],
  push: (raw) => {
    const label = decodeMidi(raw)
    set((s) => ({
      messages: s.messages.length >= MAX_LOG
        ? [...s.messages.slice(-MAX_LOG + 1), { id: _nextId++, label }]
        : [...s.messages, { id: _nextId++, label }],
    }))
  },
}))

function decodeMidi(data: number[]): string {
  if (data.length === 0) return '?'
  const status = data[0]
  const type = status & 0xf0
  const ch = (status & 0x0f) + 1

  if (status === 0xfa) return 'Start'
  if (status === 0xfb) return 'Continue'
  if (status === 0xfc) return 'Stop'
  if (status === 0xff) return 'Reset'

  if (type === 0x90 && data.length >= 3) {
    return data[2] > 0
      ? `NoteOn  ch${ch}  n${data[1]}  v${data[2]}`
      : `NoteOff ch${ch}  n${data[1]}`
  }
  if (type === 0x80 && data.length >= 3) return `NoteOff ch${ch}  n${data[1]}  v${data[2]}`
  if (type === 0xb0 && data.length >= 3) return `CC${String(data[1]).padStart(3)}  ${String(data[2]).padStart(3)}  ch${ch}`
  if (type === 0xc0 && data.length >= 2) return `PC${data[1]}  ch${ch}`
  if (type === 0xe0 && data.length >= 3) {
    const bend = ((data[2] << 7) | data[1]) - 8192
    return `Bend ${bend}  ch${ch}`
  }
  if (type === 0xd0 && data.length >= 2) return `AT ${data[1]}  ch${ch}`
  if (type === 0xa0 && data.length >= 3) return `PolyAT n${data[1]} ${data[2]}  ch${ch}`

  return data.map((b) => b.toString(16).padStart(2, '0')).join(' ')
}

interface MidiDebugPanelProps {
  visible: boolean
}

export function MidiDebugPanel({ visible }: MidiDebugPanelProps) {
  const messages = useMidiDebugStore((s) => s.messages)
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  // Track whether user has scrolled away from bottom
  function onScroll() {
    const el = scrollRef.current
    if (!el) return
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24
  }

  // Auto-scroll to bottom on new messages if pinned
  useEffect(() => {
    if (stickToBottom.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Visible tail for opacity fade (last 10 in view)
  const tail = messages.slice(-10)
  const tailIds = new Set(tail.map((m) => m.id))

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed bottom-3 right-3 w-[240px] bg-black/85 backdrop-blur-md border border-border rounded-lg p-2 font-mono"
          style={{ zIndex: 99997 }}
        >
          <div className="text-[9px] text-white/40 uppercase tracking-wide mb-1.5">
            MIDI In
            <span className="ml-2 normal-case opacity-60">{messages.length}</span>
          </div>
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="overflow-y-auto overscroll-contain space-y-px"
            style={{ maxHeight: 170 }}
          >
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                // Fade oldest of the visible tail
                let opacity = 1
                if (tailIds.has(msg.id)) {
                  const idx = tail.findIndex((m) => m.id === msg.id)
                  const age = tail.length - idx
                  opacity = Math.max(0.15, 1 - (age - 1) * 0.1)
                }
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity, x: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="text-[10px] leading-[16px] text-white tabular-nums truncate whitespace-pre"
                  >
                    {msg.label}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
