import { useShaderStore } from '../store/shaderStore'
import { useMidiStore } from '../store/midiStore'
import { ParamRow } from './ParamRow'

export function ParamMappingList() {
  const shader = useShaderStore((s) => s.activeShader)
  const deviceId = useMidiStore((s) => s.selectedDeviceId)
  const deviceMappings = useMidiStore((s) =>
    deviceId ? s.mappings[deviceId] : undefined
  )
  const deviceRelFlags = useMidiStore((s) =>
    deviceId ? s.relativeFlags[deviceId] : undefined
  )

  return (
    <div>
      <h3 style={{ fontSize: 14, color: '#aaa', marginBottom: 8 }}>Parameters</h3>
      {shader.params.map((param) => (
        <ParamRow
          key={param.name}
          param={param}
          ccNumber={deviceMappings?.[param.name]}
          isRelative={!!deviceRelFlags?.[param.name]}
        />
      ))}
    </div>
  )
}
