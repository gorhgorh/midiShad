import { useRef } from 'react'
import { useVideoStore, type VideoSourceType } from '../store/videoStore'

const sources: { value: VideoSourceType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'webcam', label: 'Webcam' },
  { value: 'url', label: 'URL' },
  { value: 'file', label: 'File' },
]

const btnStyle = (active: boolean): React.CSSProperties => ({
  background: active ? '#555' : '#222',
  color: '#fff',
  border: '1px solid ' + (active ? '#888' : '#555'),
  borderRadius: 4,
  padding: '4px 10px',
  fontSize: 13,
  cursor: 'pointer',
  marginRight: 4,
})

export function VideoSelector() {
  const sourceType = useVideoStore((s) => s.sourceType)
  const url = useVideoStore((s) => s.url)
  const setSourceType = useVideoStore((s) => s.setSourceType)
  const setUrl = useVideoStore((s) => s.setUrl)
  const setFileUrl = useVideoStore((s) => s.setFileUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileUrl(URL.createObjectURL(file))
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 14, color: '#aaa', display: 'block', marginBottom: 6 }}>
        Video Background
      </label>
      <div style={{ display: 'flex', marginBottom: 8 }}>
        {sources.map((s) => (
          <button
            key={s.value}
            style={btnStyle(sourceType === s.value)}
            onClick={() => {
              setSourceType(s.value)
              if (s.value === 'file') fileInputRef.current?.click()
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      {sourceType === 'url' && (
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/video.mp4"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: '#222',
            color: '#fff',
            border: '1px solid #555',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 13,
          }}
        />
      )}
      {sourceType === 'file' && (
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFile}
          style={{ fontSize: 13, color: '#aaa' }}
        />
      )}
    </div>
  )
}
