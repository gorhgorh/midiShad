import { useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { setDebugContainer, updateScrollTracking } from '../atoms/midiDebugAtoms'

interface MidiDebugPanelProps {
  visible: boolean
}

export function MidiDebugPanel({ visible }: MidiDebugPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Register/unregister container for DOM injection
  useEffect(() => {
    if (visible && scrollRef.current) {
      setDebugContainer(scrollRef.current)
    }
    return () => setDebugContainer(null)
  }, [visible])

  const onScroll = useCallback(() => {
    if (scrollRef.current) updateScrollTracking(scrollRef.current)
  }, [])

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
            <span className="ml-2 normal-case opacity-60" data-debug-count>0</span>
          </div>
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="overflow-y-auto overscroll-contain space-y-px"
            style={{ maxHeight: 170 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
