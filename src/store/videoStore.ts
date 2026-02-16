import { create } from 'zustand'

export type VideoSourceType = 'none' | 'webcam' | 'url' | 'file'

interface VideoState {
  sourceType: VideoSourceType
  url: string
  fileUrl: string
  isPlaying: boolean
  setSourceType: (type: VideoSourceType) => void
  setUrl: (url: string) => void
  setFileUrl: (url: string) => void
  clear: () => void
}

export const useVideoStore = create<VideoState>((set, get) => ({
  sourceType: 'none',
  url: '',
  fileUrl: '',
  isPlaying: false,

  setSourceType: (sourceType) => {
    // Revoke old file URL when switching away from file
    const prev = get()
    if (prev.sourceType === 'file' && prev.fileUrl && sourceType !== 'file') {
      URL.revokeObjectURL(prev.fileUrl)
    }
    set({ sourceType, isPlaying: sourceType !== 'none' })
  },

  setUrl: (url) => set({ url }),

  setFileUrl: (fileUrl) => {
    // Revoke previous file URL
    const prev = get().fileUrl
    if (prev) URL.revokeObjectURL(prev)
    set({ fileUrl })
  },

  clear: () => {
    const prev = get()
    if (prev.fileUrl) URL.revokeObjectURL(prev.fileUrl)
    set({ sourceType: 'none', url: '', fileUrl: '', isPlaying: false })
  },
}))
