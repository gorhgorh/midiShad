import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useCallback, useRef } from 'react'
import createDebug from 'debug'
import { ChevronDown, ChevronUp, RefreshCw, Save, Check, X, Trash2 } from 'lucide-react'

const dbg = createDebug('ply:srvr')

interface MidiDevice {
  id: number
  name: string
  type: 'input' | 'output'
}

interface AdapterInfo {
  id: string
  protocol: string
  status: 'running' | 'stopped' | 'error'
  config: Record<string, unknown>
  extra?: {
    deviceName?: string
    devices?: MidiDevice[]
  }
}

interface ServerStatus {
  name: string
  version: string
  uptime: number
  adapters: AdapterInfo[]
  channelCount: number
}

type MidiTab = 'external' | 'internal'

interface MidiFilters {
  clock: boolean
  cc: boolean
  note: boolean
  other: boolean
}

interface MidiMessage {
  id: number
  source: 'midi' | 'ws' // where the message came from
  type: string
  channel: string
  value: number
  num?: number // CC number or note number
  duration?: number // note duration in ms
  timestamp: number
  delta: number // ms since previous message
}

export const Route = createFileRoute('/srvr')({
  component: SrvrPage,
})

function SrvrPage() {
  const [status, setStatus] = useState<ServerStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setStatus(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect')
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  const midiAdapter = status?.adapters.find((a) => a.protocol === 'midi')
  const wsAdapter = status?.adapters.find((a) => a.protocol === 'ws')

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-medium">_almst_srvd</h1>
            <p className="text-sm text-white/50 mt-1">Server Configuration</p>
          </div>
          <button
            onClick={fetchStatus}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-400 font-medium">Cannot connect to server</p>
            <p className="text-sm text-red-400/70 mt-1">{error}</p>
          </div>
        )}

        {/* Status bar */}
        {status && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-xs text-white/50 uppercase tracking-wide">Version</p>
              <p className="text-xl mt-1 font-light">{status.version}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-xs text-white/50 uppercase tracking-wide">Uptime</p>
              <p className="text-xl mt-1 font-light">{formatUptime(status.uptime)}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-xs text-white/50 uppercase tracking-wide">Channels</p>
              <p className="text-xl mt-1 font-light">{status.channelCount}</p>
            </div>
          </div>
        )}

        {/* MIDI Adapter Section */}
        {status && (
          <MidiAdapterSection adapter={midiAdapter} onRefresh={fetchStatus} />
        )}

        {/* WS Adapter Section */}
        {status && wsAdapter && (
          <WsAdapterSection adapter={wsAdapter} />
        )}

        {/* Loading state */}
        {loading && !status && !error && (
          <div className="text-center text-white/50 py-12">Connecting to server...</div>
        )}
      </div>
    </div>
  )
}

function MidiAdapterSection({
  adapter,
  onRefresh,
}: {
  adapter?: AdapterInfo
  onRefresh: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [activeTab, setActiveTab] = useState<MidiTab>('external')

  // External tab state
  const [selectedInputs, setSelectedInputs] = useState<Set<string>>(new Set())
  const [selectedOutput, setSelectedOutput] = useState<string>('')
  const [virtualOut, setVirtualOut] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<'success' | 'error' | null>(null)

  // Internal tab state (send frequency only for virtual out)
  const [sendFrequency, setSendFrequency] = useState(60)
  const [noteMode, setNoteMode] = useState<'instant' | 'duration'>('instant')
  const [filters, setFilters] = useState<MidiFilters>({
    clock: true,
    cc: true,
    note: true,
    other: false,
  })

  // Debug messages
  const [messages, setMessages] = useState<MidiMessage[]>([])
  const msgIdRef = useRef(0)

  // Get devices from adapter info
  const devices = adapter?.extra?.devices ?? []
  const inputs = devices.filter((d) => d.type === 'input')
  const outputs = devices.filter((d) => d.type === 'output')

  // Current config
  const currentConfig = adapter?.config as {
    inputDevices?: string[]
    inputDevice?: string // legacy single device
    virtualIn?: boolean
    outputDevice?: string
    virtualOut?: boolean
    virtual?: boolean // legacy
    noteMode?: 'instant' | 'duration'
  } | undefined

  // Track if we've initialized from server config
  const [initialized, setInitialized] = useState(false)

  // Initialize state from current config (only once)
  useEffect(() => {
    if (currentConfig && !initialized) {
      // Support legacy single inputDevice
      const physicalInputs = currentConfig.inputDevices ?? (currentConfig.inputDevice ? [currentConfig.inputDevice] : [])
      const inputSet = new Set(physicalInputs)
      // Add virtual marker if virtualIn is enabled
      if (currentConfig.virtualIn ?? currentConfig.virtual ?? true) {
        inputSet.add('_virtual_')
      }
      setSelectedInputs(inputSet)
      setSelectedOutput(currentConfig.outputDevice ?? '')
      setVirtualOut(currentConfig.virtualOut ?? currentConfig.virtual ?? true)
      setNoteMode(currentConfig.noteMode ?? 'instant')
      setInitialized(true)
    }
  }, [currentConfig, initialized])

  // Check if config changed
  const currentPhysicalInputs = currentConfig?.inputDevices ?? (currentConfig?.inputDevice ? [currentConfig.inputDevice] : [])
  const currentVirtualIn = currentConfig?.virtualIn ?? currentConfig?.virtual ?? true
  const selectedPhysicalInputs = [...selectedInputs].filter(d => d !== '_virtual_')
  const selectedVirtualIn = selectedInputs.has('_virtual_')

  const inputsChanged =
    selectedPhysicalInputs.length !== currentPhysicalInputs.length ||
    selectedPhysicalInputs.some(i => !currentPhysicalInputs.includes(i)) ||
    selectedVirtualIn !== currentVirtualIn

  const hasChanges =
    inputsChanged ||
    selectedOutput !== (currentConfig?.outputDevice ?? '') ||
    virtualOut !== (currentConfig?.virtualOut ?? currentConfig?.virtual ?? true) ||
    noteMode !== (currentConfig?.noteMode ?? 'instant')

  const handleSave = async () => {
    if (!adapter) return

    setSaving(true)
    setSaveResult(null)

    // Separate virtual input marker from physical devices
    const virtualIn = selectedInputs.has('_virtual_')
    const physicalInputs = [...selectedInputs].filter(d => d !== '_virtual_' && d !== '_almst_md')

    const newConfig = {
      inputDevices: physicalInputs,
      virtualIn,
      outputDevice: virtualOut ? undefined : (selectedOutput || undefined),
      virtualOut,
      sendFrequency: virtualOut ? sendFrequency : undefined,
      noteMode,
    }
    dbg('Saving MIDI config: %o', newConfig)

    try {
      // Stop adapter first
      await fetch(`/api/adapters/${adapter.id}/stop`, { method: 'POST' })

      // Update config
      await fetch(`/api/adapters/${adapter.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: newConfig }),
      })

      // Start adapter
      const res = await fetch(`/api/adapters/${adapter.id}/start`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to start adapter')

      setSaveResult('success')
      onRefresh()
    } catch {
      setSaveResult('error')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveResult(null), 2000)
    }
  }

  // WebSocket for debug messages
  const lastTimestampRef = useRef(0)

  useEffect(() => {
    if (adapter?.status !== 'running') return

    const wsUrl = `ws://${window.location.hostname}:9900`
    let ws: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let disposed = false

    function connect() {
      if (disposed) return
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        if (disposed) { ws?.close(); return }
        dbg('WS connected to %s', wsUrl)
        // Subscribe to MIDI frame channel at 60hz
        const subMsg = {
          type: 'subscribe',
          channels: ['midi.*.frame', 'midi.*.clock.bpm'],
          maxRate: 60,
        }
        dbg('WS subscribing: %o', subMsg)
        ws?.send(JSON.stringify(subMsg))
      }

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          dbg('WS received: %o', msg)
          if (msg.type !== 'batch' || !msg.values) return

          const now = msg.ts ?? Date.now()

          // Collect all new messages from this batch
          const newMessages: MidiMessage[] = []
          const delta = lastTimestampRef.current > 0 ? now - lastTimestampRef.current : 0
          lastTimestampRef.current = now

          // Parse each channel
          for (const [channel, value] of Object.entries(msg.values)) {
            const parts = channel.split('.')
            if (parts[0] !== 'midi') continue

            const device = parts[1] ?? ''

            // Frame channel: midi.{device}.frame
            if (parts.length === 3 && parts[2] === 'frame') {
              const frame = value as {
                note: { note: number; velocity: number; duration: number } | null
                cc: Array<[number, number]>
              }

              // Add note message if present
              if (frame.note) {
                newMessages.push({
                  id: ++msgIdRef.current,
                  source: 'midi',
                  type: 'note',
                  channel,
                  value: frame.note.velocity,
                  num: frame.note.note,
                  duration: frame.note.duration,
                  timestamp: now,
                  delta,
                })
              }

              // Add CC messages
              for (const [cc, val] of frame.cc) {
                newMessages.push({
                  id: ++msgIdRef.current,
                  source: 'midi',
                  type: 'cc',
                  channel: `midi.${device}.cc.${cc}`,
                  value: val,
                  num: cc,
                  timestamp: now,
                  delta: 0,
                })
              }
              continue
            }

            // Clock: midi.{device}.clock.bpm
            if (parts.length === 4 && parts[2] === 'clock') {
              newMessages.push({
                id: ++msgIdRef.current,
                source: 'midi',
                type: 'clock',
                channel,
                value: value as number,
                timestamp: now,
                delta,
              })
            }
          }

          // Single state update with all new messages
          if (newMessages.length > 0) {
            setMessages((prev) => [...newMessages, ...prev].slice(0, 100))
          }
        } catch { /* ignore parse errors */ }
      }

      ws.onclose = () => {
        // Reconnect after 2s (unless disposed)
        if (!disposed) {
          reconnectTimer = setTimeout(connect, 2000)
        }
      }
    }

    connect()

    return () => {
      disposed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (ws) ws.close()
    }
  }, [adapter?.status])

  const filteredMessages = messages.filter((m) => {
    if (m.type === 'clock' && !filters.clock) return false
    if (m.type === 'cc' && !filters.cc) return false
    if (m.type === 'note' && !filters.note) return false
    if (!['clock', 'cc', 'note'].includes(m.type) && !filters.other) return false
    return true
  })

  return (
    <div className="bg-white/5 rounded-lg overflow-hidden">
      {/* Header - always visible */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`w-2 h-2 rounded-full ${
              adapter?.status === 'running'
                ? 'bg-green-500'
                : adapter?.status === 'error'
                  ? 'bg-red-500'
                  : 'bg-white/30'
            }`}
          />
          <h2 className="font-medium">MIDI Adapter</h2>
          <span className="text-xs text-white/40">
            {adapter?.status ?? 'not configured'}
          </span>
        </div>
      </div>

      {/* Content - collapsible */}
      {expanded && (
        <div className="px-4 pb-4">
          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-black/30 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('external')}
              className={`flex-1 px-4 py-2 rounded-md text-sm transition-colors ${
                activeTab === 'external'
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              Inputs
            </button>
            <button
              onClick={() => setActiveTab('internal')}
              className={`flex-1 px-4 py-2 rounded-md text-sm transition-colors ${
                activeTab === 'internal'
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              Output
            </button>
          </div>

          {/* Inputs Tab */}
          {activeTab === 'external' && (
            <div className="space-y-4">
              <div className="space-y-2 max-h-48 overflow-y-auto bg-black/20 rounded-lg p-3">
                {/* Virtual input option */}
                <label className="flex items-center gap-3 cursor-pointer text-blue-400">
                  <input
                    type="checkbox"
                    checked={selectedInputs.has('_virtual_')}
                    onChange={(e) => {
                      const newSet = new Set(selectedInputs)
                      if (e.target.checked) {
                        newSet.add('_virtual_')
                      } else {
                        newSet.delete('_virtual_')
                      }
                      setSelectedInputs(newSet)
                    }}
                    className="w-4 h-4 rounded bg-black/30 border-white/20"
                  />
                  <span className="text-sm">_almst_md (virtual)</span>
                </label>

                {inputs.filter(d => d.name !== '_almst_md').length === 0 ? (
                  <p className="text-sm text-white/30">No physical input devices found</p>
                ) : (
                  inputs.filter(d => d.name !== '_almst_md').map((d) => (
                    <label key={`in-${d.name}`} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedInputs.has(d.name)}
                        onChange={(e) => {
                          const newSet = new Set(selectedInputs)
                          if (e.target.checked) {
                            newSet.add(d.name)
                          } else {
                            newSet.delete(d.name)
                          }
                          setSelectedInputs(newSet)
                        }}
                        className="w-4 h-4 rounded bg-black/30 border-white/20"
                      />
                      <span className="text-sm">{d.name}</span>
                    </label>
                  ))
                )}
              </div>

              {/* Note Mode */}
              <div className="pt-4 border-t border-white/10">
                <label className="block text-sm text-white/70 mb-2">Note Mode</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNoteMode('instant')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                      noteMode === 'instant'
                        ? 'bg-blue-600 text-white'
                        : 'bg-black/30 text-white/50 hover:text-white/70'
                    }`}
                  >
                    Instant
                  </button>
                  <button
                    onClick={() => setNoteMode('duration')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                      noteMode === 'duration'
                        ? 'bg-blue-600 text-white'
                        : 'bg-black/30 text-white/50 hover:text-white/70'
                    }`}
                  >
                    Duration
                  </button>
                </div>
                <p className="text-xs text-white/40 mt-2">
                  {noteMode === 'instant'
                    ? 'Emit note on/off immediately (per-note channels)'
                    : 'Emit single note with duration on release'}
                </p>
              </div>

              {/* Save button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    hasChanges && !saving
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-white/5 text-white/30 cursor-not-allowed'
                  }`}
                >
                  {saving ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : saveResult === 'success' ? (
                    <Check size={14} className="text-green-400" />
                  ) : saveResult === 'error' ? (
                    <X size={14} className="text-red-400" />
                  ) : (
                    <Save size={14} />
                  )}
                  {saving ? 'Saving...' : saveResult === 'success' ? 'Saved!' : saveResult === 'error' ? 'Failed' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {/* Output Tab */}
          {activeTab === 'internal' && (
            <div className="space-y-4">
              {/* Output device dropdown - includes virtual option */}
              <div>
                <label className="block text-sm text-white/70 mb-2">Output Device</label>
                <select
                  value={virtualOut ? '_virtual_' : selectedOutput}
                  onChange={(e) => {
                    if (e.target.value === '_virtual_') {
                      setVirtualOut(true)
                      setSelectedOutput('')
                    } else {
                      setVirtualOut(false)
                      setSelectedOutput(e.target.value)
                    }
                  }}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                >
                  <option value="">None</option>
                  <option value="_virtual_" className="text-blue-400">_almst_md (virtual)</option>
                  {outputs.filter(d => d.name !== '_almst_md').map((d) => (
                    <option key={`out-${d.name}`} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Send frequency - only when virtual out */}
              {virtualOut && (
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Send Frequency: <span className="text-white">{sendFrequency}</span> /sec
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={120}
                    value={sendFrequency}
                    onChange={(e) => setSendFrequency(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}

              {/* Message Filters (for debug display) */}
              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-white/70 mb-2">Debug Filters</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['clock', 'cc', 'note', 'other'] as const).map((key) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters[key]}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, [key]: e.target.checked }))
                        }
                        className="w-4 h-4 rounded bg-black/30 border-white/20"
                      />
                      <span className="text-sm capitalize">{key}</span>
                      {key === 'other' && (
                        <span className="text-xs text-white/40">(sysex, etc)</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Save button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    hasChanges && !saving
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-white/5 text-white/30 cursor-not-allowed'
                  }`}
                >
                  {saving ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : saveResult === 'success' ? (
                    <Check size={14} className="text-green-400" />
                  ) : saveResult === 'error' ? (
                    <X size={14} className="text-red-400" />
                  ) : (
                    <Save size={14} />
                  )}
                  {saving ? 'Saving...' : saveResult === 'success' ? 'Saved!' : saveResult === 'error' ? 'Failed' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {/* Debug Section */}
          {adapter?.status === 'running' && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-white/70">Debug Messages ({filteredMessages.length})</p>
                <button
                  onClick={() => {
                    setMessages([])
                    lastTimestampRef.current = 0
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-white/50 hover:text-white hover:bg-white/10 rounded transition-colors"
                >
                  <Trash2 size={12} />
                  Flush
                </button>
              </div>
              <div className="bg-black/30 rounded-lg p-2 h-32 overflow-y-auto font-mono text-xs">
                {filteredMessages.length === 0 ? (
                  <p className="text-white/30">Waiting for messages...</p>
                ) : (
                  filteredMessages.map((m) => {
                    const parts = m.channel.split('.')
                    const device = parts[1] ?? ''
                    return (
                      <div key={m.id} className="flex gap-2 text-white/60">
                        <span className={`w-8 text-xs ${m.source === 'midi' ? 'text-purple-400' : 'text-cyan-400'}`}>
                          {m.source}
                        </span>
                        <span className="text-white/30 w-10 text-right tabular-nums">
                          {m.delta > 0 ? `+${m.delta}` : '—'}
                        </span>
                        <span
                          className={`w-14 ${
                            m.type === 'cc'
                              ? 'text-blue-400'
                              : m.type === 'note'
                                ? 'text-green-400'
                                : m.type === 'clock'
                                  ? 'text-yellow-400'
                                  : 'text-white/50'
                          }`}
                        >
                          {m.type === 'cc' ? `CC${m.num}` : m.type === 'note' ? `N${m.num}` : m.type}
                        </span>
                        <span className="text-white/80 w-8 text-right tabular-nums">{m.value}</span>
                        {m.type === 'note' && m.duration !== undefined && (
                          <span className="text-white/40 w-12 text-right tabular-nums">{m.duration}ms</span>
                        )}
                        <span className="text-white/20 truncate">{device}</span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapse toggle at bottom */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full py-2 flex items-center justify-center text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors"
      >
        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
    </div>
  )
}

function WsAdapterSection({ adapter }: { adapter: AdapterInfo }) {
  const [expanded, setExpanded] = useState(false)
  const wsExtra = adapter.extra as { clientCount?: number; port?: number } | undefined

  return (
    <div className="bg-white/5 rounded-lg overflow-hidden mt-4">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`w-2 h-2 rounded-full ${
              adapter.status === 'running'
                ? 'bg-green-500'
                : adapter.status === 'error'
                  ? 'bg-red-500'
                  : 'bg-white/30'
            }`}
          />
          <h2 className="font-medium">WebSocket Adapter</h2>
          <span className="text-xs text-white/40">{adapter.status}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-white/50">
          <span>Port: {wsExtra?.port ?? 9900}</span>
          <span>Clients: {wsExtra?.clientCount ?? 0}</span>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="bg-black/20 rounded-lg p-3 text-sm">
            <p className="text-white/70">WebSocket endpoint:</p>
            <code className="text-blue-400">ws://localhost:{wsExtra?.port ?? 9900}</code>
          </div>
          <div className="text-xs text-white/40">
            <p>Subscribe to channels with:</p>
            <pre className="bg-black/30 rounded p-2 mt-1 overflow-x-auto">
{`{
  "type": "subscribe",
  "channels": ["midi.*.frame"],
  "maxRate": 60
}`}
            </pre>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full py-2 flex items-center justify-center text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors"
      >
        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
    </div>
  )
}
