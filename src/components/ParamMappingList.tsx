import { useModuleStore } from '../store/moduleStore'
import { useMidiStore } from '../store/midiStore'
import { ParamRow } from './ParamRow'
import { OptionRow } from './OptionRow'

export function ParamMappingList() {
  const activeModule = useModuleStore((s) => s.activeModule)
  const callAction = useModuleStore((s) => s.callAction)
  const deviceId = useMidiStore((s) => s.selectedDeviceId)
  const deviceMappings = useMidiStore((s) =>
    deviceId ? s.mappings[deviceId] : undefined
  )
  const deviceRelFlags = useMidiStore((s) =>
    deviceId ? s.relativeFlags[deviceId] : undefined
  )

  if (!activeModule) return null

  return (
    <div>
      {activeModule.params.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, color: '#aaa', marginBottom: 8 }}>Parameters</h3>
          {activeModule.params.map((param) => (
            <ParamRow
              key={param.name}
              param={param}
              ccNumber={deviceMappings?.[param.name]}
              isRelative={!!deviceRelFlags?.[param.name]}
            />
          ))}
        </>
      )}
      {activeModule.options.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, color: '#aaa', marginBottom: 8, marginTop: 12 }}>Options</h3>
          {activeModule.options.map((opt) => (
            <OptionRow key={opt.name} option={opt} />
          ))}
        </>
      )}
      {activeModule.actions.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, color: '#aaa', marginBottom: 8, marginTop: 12 }}>Actions</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {activeModule.actions.map((action) => (
              <button
                key={action.name}
                onClick={() => callAction?.(action.methodName)}
                style={{
                  fontSize: 12,
                  padding: '4px 12px',
                  background: '#333',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
