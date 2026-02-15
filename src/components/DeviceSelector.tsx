import { useMidiStore } from '../store/midiStore'

export function DeviceSelector() {
  const devices = useMidiStore((s) => s.devices)
  const selectedDeviceId = useMidiStore((s) => s.selectedDeviceId)
  const setSelectedDevice = useMidiStore((s) => s.setSelectedDevice)

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 14, color: '#aaa', marginRight: 8 }}>MIDI Device</label>
      <select
        value={selectedDeviceId ?? ''}
        onChange={(e) => setSelectedDevice(e.target.value || null)}
        style={{
          background: '#222',
          color: '#fff',
          border: '1px solid #555',
          borderRadius: 4,
          padding: '4px 8px',
          fontSize: 13,
        }}
      >
        <option value="">None</option>
        {devices.map((d) => (
          <option key={d.id} value={d.id}>{d.name || d.id}</option>
        ))}
      </select>
    </div>
  )
}
