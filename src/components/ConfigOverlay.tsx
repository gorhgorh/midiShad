import { useNavigate } from '@tanstack/react-router'
import { ModuleSelector } from './ModuleSelector'
import { DeviceSelector } from './DeviceSelector'
import { ParamMappingList } from './ParamMappingList'

export function ConfigOverlay() {
  const navigate = useNavigate()

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) navigate({ to: '/' })
      }}
    >
      <div
        style={{
          background: 'rgba(20,20,20,0.95)',
          borderRadius: 12,
          padding: 24,
          minWidth: 360,
          maxWidth: 480,
          maxHeight: '80vh',
          overflowY: 'auto',
          border: '1px solid #333',
        }}
      >
        <h2 style={{ fontSize: 18, color: '#fff', marginBottom: 16 }}>MidiShad Config</h2>
        <ModuleSelector />
        <DeviceSelector />
        <ParamMappingList />
      </div>
    </div>
  )
}
