import { useShaderStore } from './shaderStore'
import { useMidiStore } from './midiStore'
import { useVideoStore } from './videoStore'
import type { VideoSourceType } from './videoStore'

const KEYS = {
  device: 'midishad:device',
  shader: 'midishad:shader',
  mappings: 'midishad:mappings',
  relativeFlags: 'midishad:relativeFlags',
  videoSource: 'midishad:videoSource',
  videoUrl: 'midishad:videoUrl',
} as const

export function loadPersisted() {
  try {
    const shaderId = localStorage.getItem(KEYS.shader)
    if (shaderId) useShaderStore.getState().setActiveShader(shaderId)

    const deviceId = localStorage.getItem(KEYS.device)
    if (deviceId) useMidiStore.getState().setSelectedDevice(deviceId)

    const mappingsRaw = localStorage.getItem(KEYS.mappings)
    if (mappingsRaw) {
      useMidiStore.setState({ mappings: JSON.parse(mappingsRaw) })
    }

    const relRaw = localStorage.getItem(KEYS.relativeFlags)
    if (relRaw) {
      useMidiStore.setState({ relativeFlags: JSON.parse(relRaw) })
    }

    const videoSource = localStorage.getItem(KEYS.videoSource) as VideoSourceType | null
    const videoUrl = localStorage.getItem(KEYS.videoUrl)
    // Only restore url and webcam sources (file blob URLs don't survive reload)
    if (videoSource && videoSource !== 'file') {
      if (videoUrl) useVideoStore.getState().setUrl(videoUrl)
      useVideoStore.getState().setSourceType(videoSource)
    }
  } catch {
    // ignore corrupt localStorage
  }
}

export function setupPersistence() {
  useShaderStore.subscribe((state) => {
    localStorage.setItem(KEYS.shader, state.activeShader.id)
  })

  useMidiStore.subscribe((state) => {
    if (state.selectedDeviceId) {
      localStorage.setItem(KEYS.device, state.selectedDeviceId)
    }
    localStorage.setItem(KEYS.mappings, JSON.stringify(state.mappings))
    localStorage.setItem(KEYS.relativeFlags, JSON.stringify(state.relativeFlags))
  })

  useVideoStore.subscribe((state) => {
    localStorage.setItem(KEYS.videoSource, state.sourceType)
    localStorage.setItem(KEYS.videoUrl, state.url)
  })
}
