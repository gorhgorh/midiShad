/**
 * DOM-based MIDI debug log — bypasses Jotai/React for zero overhead.
 * Messages are injected directly into a container div registered
 * by MidiDebugPanel.
 */

const MAX_LOG = 500

let _debugContainer: HTMLDivElement | null = null
let _debugEnabled = false
let _stickToBottom = true
let _messageCount = 0

export function setDebugContainer(el: HTMLDivElement | null) {
  _debugContainer = el
  _messageCount = el ? el.childNodes.length : 0
}

export function setDebugEnabled(enabled: boolean) {
  _debugEnabled = enabled
}

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

/** Update auto-scroll tracking. Called by container's onScroll. */
export function updateScrollTracking(el: HTMLDivElement) {
  _stickToBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24
}

/** Push a MIDI message to the debug panel via direct DOM manipulation. */
export function pushDebugMessage(raw: number[]) {
  if (!_debugEnabled || !_debugContainer) return

  const label = decodeMidi(raw)
  const div = document.createElement('div')
  div.style.cssText = 'font-size:10px;line-height:16px;color:white;font-variant-numeric:tabular-nums;white-space:pre;overflow:hidden;text-overflow:ellipsis;'
  div.textContent = label
  _debugContainer.appendChild(div)
  _messageCount++

  // Cap at MAX_LOG by removing oldest
  while (_messageCount > MAX_LOG && _debugContainer.firstChild) {
    _debugContainer.removeChild(_debugContainer.firstChild)
    _messageCount--
  }

  // Auto-scroll if pinned to bottom
  if (_stickToBottom) {
    _debugContainer.scrollTop = _debugContainer.scrollHeight
  }

  // Update counter display
  const counter = _debugContainer.parentElement?.querySelector('[data-debug-count]')
  if (counter) {
    counter.textContent = String(_messageCount)
  }
}
