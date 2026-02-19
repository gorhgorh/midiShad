import { useModuleStore } from './moduleStore'
import { useMidiStore } from './midiStore'
import { useLfoStore } from './lfoStore'

const KEYS = {
  device: 'midishad:device',
  module: 'midishad:module',
  mappings: 'midishad:mappings',
  relativeFlags: 'midishad:relativeFlags',
  lfoConfigs: 'midishad:lfoConfigs',
} as const

export function loadPersisted() {
  try {
    const moduleId = localStorage.getItem(KEYS.module)
    if (moduleId) useModuleStore.getState().setActiveModule(moduleId)

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

    const lfoRaw = localStorage.getItem(KEYS.lfoConfigs)
    if (lfoRaw) {
      useLfoStore.setState({ configs: JSON.parse(lfoRaw) })
    }
  } catch {
    // ignore corrupt localStorage
  }
}

export function setupPersistence() {
  useModuleStore.subscribe((state) => {
    if (state.activeModule) {
      localStorage.setItem(KEYS.module, state.activeModule.id)
    }
  })

  useMidiStore.subscribe((state) => {
    if (state.selectedDeviceId) {
      localStorage.setItem(KEYS.device, state.selectedDeviceId)
    }
    localStorage.setItem(KEYS.mappings, JSON.stringify(state.mappings))
    localStorage.setItem(KEYS.relativeFlags, JSON.stringify(state.relativeFlags))
  })

  useLfoStore.subscribe((state) => {
    localStorage.setItem(KEYS.lfoConfigs, JSON.stringify(state.configs))
  })
}
