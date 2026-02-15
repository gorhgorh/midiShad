import { useShaderStore } from './shaderStore'
import { useMidiStore } from './midiStore'

const KEYS = {
  device: 'midishad:device',
  shader: 'midishad:shader',
  mappings: 'midishad:mappings',
  relativeFlags: 'midishad:relativeFlags',
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
}
