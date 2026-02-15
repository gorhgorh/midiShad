import { shaders } from '../shaders/registry'
import { useShaderStore } from '../store/shaderStore'

export function ShaderSelector() {
  const activeId = useShaderStore((s) => s.activeShader.id)
  const setActiveShader = useShaderStore((s) => s.setActiveShader)

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 14, color: '#aaa', marginRight: 8 }}>Shader</label>
      <select
        value={activeId}
        onChange={(e) => setActiveShader(e.target.value)}
        style={{
          background: '#222',
          color: '#fff',
          border: '1px solid #555',
          borderRadius: 4,
          padding: '4px 8px',
          fontSize: 13,
        }}
      >
        {shaders.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>
  )
}
