import { useState, useRef, useEffect } from 'react'
import type { ParamDescriptor } from '../shaders/types'
import { useShaderStore } from '../store/shaderStore'
import { useMidiStore } from '../store/midiStore'

interface ParamRowProps {
  param: ParamDescriptor
  ccNumber: number | undefined
  isRelative: boolean
}

export function ParamRow({ param, ccNumber, isRelative }: ParamRowProps) {
  const value = useShaderStore((s) => s.paramValues[param.name] ?? param.default)
  const setParamValue = useShaderStore((s) => s.setParamValue)
  const learnTarget = useMidiStore((s) => s.learnTarget)
  const setLearnTarget = useMidiStore((s) => s.setLearnTarget)
  const selectedDeviceId = useMidiStore((s) => s.selectedDeviceId)
  const assignCc = useMidiStore((s) => s.assignCc)
  const unassignParam = useMidiStore((s) => s.unassignParam)
  const toggleRelative = useMidiStore((s) => s.toggleRelative)
  const isLearning = learnTarget === param.name

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function startEdit() {
    if (isLearning) {
      setLearnTarget(null)
      return
    }
    setDraft(ccNumber != null ? String(ccNumber) : '')
    setEditing(true)
  }

  function commitEdit() {
    setEditing(false)
    const n = parseInt(draft, 10)
    if (!selectedDeviceId) return
    if (isNaN(n) || n < 0 || n > 127) return
    assignCc(selectedDeviceId, param.name, n)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditing(false)
    e.stopPropagation()
  }

  const hasCc = ccNumber != null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
      <label style={{ width: 90, fontSize: 13, color: '#ccc' }}>{param.label}</label>
      <input
        type="range"
        min={param.min}
        max={param.max}
        step={(param.max - param.min) / 200}
        value={value}
        onChange={(e) => setParamValue(param.name, parseFloat(e.target.value))}
        style={{ flex: 1 }}
      />
      <span style={{ width: 44, fontSize: 12, color: '#888', textAlign: 'right' }}>
        {value.toFixed(1)}
      </span>

      {editing ? (
        <input
          ref={inputRef}
          type="number"
          min={0}
          max={127}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={onKeyDown}
          style={{
            width: 55,
            fontSize: 11,
            padding: '2px 4px',
            background: '#111',
            color: '#fff',
            border: '1px solid #88f',
            borderRadius: 4,
            textAlign: 'center',
          }}
        />
      ) : (
        <>
          <button
            onClick={() => setLearnTarget(isLearning ? null : param.name)}
            style={{
              fontSize: 11,
              padding: '2px 6px',
              background: isLearning ? '#f44' : '#333',
              color: '#fff',
              border: isLearning ? '1px solid #f88' : '1px solid #555',
              borderRadius: 4,
              cursor: 'pointer',
              minWidth: 50,
            }}
          >
            {isLearning ? 'Cancel' : hasCc ? `CC${ccNumber}` : 'Learn'}
          </button>
          {!isLearning && (
            <button
              onClick={startEdit}
              title="Type CC number"
              style={{
                fontSize: 10,
                padding: '2px 5px',
                background: '#222',
                color: '#888',
                border: '1px solid #444',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              #
            </button>
          )}
          {hasCc && selectedDeviceId && (
            <>
              <button
                onClick={() => toggleRelative(selectedDeviceId, param.name)}
                title={isRelative ? 'Relative mode (click to switch to absolute)' : 'Absolute mode (click to switch to relative)'}
                style={{
                  fontSize: 10,
                  padding: '2px 5px',
                  background: isRelative ? '#47a' : '#222',
                  color: isRelative ? '#fff' : '#666',
                  border: isRelative ? '1px solid #6af' : '1px solid #444',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: isRelative ? 700 : 400,
                }}
              >
                Rel
              </button>
              <button
                onClick={() => unassignParam(selectedDeviceId, param.name)}
                title="Remove CC assignment"
                style={{
                  fontSize: 10,
                  padding: '2px 5px',
                  background: '#222',
                  color: '#a66',
                  border: '1px solid #533',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                x
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}
