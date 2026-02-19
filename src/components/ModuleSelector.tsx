import { useModuleStore } from '../store/moduleStore'

export function ModuleSelector() {
  const modules = useModuleStore((s) => s.modules)
  const activeId = useModuleStore((s) => s.activeModule?.id ?? '')
  const setActiveModule = useModuleStore((s) => s.setActiveModule)

  // Group by category
  const byCategory = new Map<string, typeof modules>()
  for (const m of modules) {
    const list = byCategory.get(m.category) ?? []
    list.push(m)
    byCategory.set(m.category, list)
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 14, color: '#aaa', marginRight: 8 }}>Module</label>
      <select
        value={activeId}
        onChange={(e) => setActiveModule(e.target.value)}
        style={{
          background: '#222',
          color: '#fff',
          border: '1px solid #555',
          borderRadius: 4,
          padding: '4px 8px',
          fontSize: 13,
        }}
      >
        {[...byCategory.entries()].map(([cat, mods]) => (
          <optgroup key={cat} label={cat}>
            {mods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}
