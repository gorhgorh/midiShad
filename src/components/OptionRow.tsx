import type { OptionDescriptor } from '../types'
import { useModuleStore } from '../store/moduleStore'

interface OptionRowProps {
  option: OptionDescriptor
}

export function OptionRow({ option }: OptionRowProps) {
  const value = useModuleStore((s) => s.optionValues[option.name] ?? option.defaultVal)
  const setOptionValue = useModuleStore((s) => s.setOptionValue)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
      <label style={{ width: 90, fontSize: 13, color: '#ccc' }}>{option.label}</label>

      {option.type === 'color' && (
        <input
          type="color"
          value={String(value)}
          onChange={(e) => setOptionValue(option.name, e.target.value)}
          style={{ width: 40, height: 26, border: '1px solid #555', borderRadius: 4, background: '#222', cursor: 'pointer' }}
        />
      )}

      {option.type === 'boolean' && (
        <button
          onClick={() => setOptionValue(option.name, !value)}
          style={{
            fontSize: 11,
            padding: '2px 8px',
            background: value ? '#1a5' : '#333',
            color: '#fff',
            border: value ? '1px solid #2d8' : '1px solid #555',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          {value ? 'On' : 'Off'}
        </button>
      )}

      {option.type === 'select' && option.values && (
        <select
          value={String(value)}
          onChange={(e) => setOptionValue(option.name, e.target.value)}
          style={{
            background: '#222',
            color: '#fff',
            border: '1px solid #555',
            borderRadius: 4,
            padding: '2px 6px',
            fontSize: 12,
          }}
        >
          {option.values.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      )}

      {(option.type === 'text' || option.type === 'assetFile' || option.type === 'assetDir') && (
        <input
          type="text"
          value={String(value)}
          onChange={(e) => setOptionValue(option.name, e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          style={{
            flex: 1,
            background: '#222',
            color: '#fff',
            border: '1px solid #555',
            borderRadius: 4,
            padding: '2px 6px',
            fontSize: 12,
          }}
        />
      )}
    </div>
  )
}
