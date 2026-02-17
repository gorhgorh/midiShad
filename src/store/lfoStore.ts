import { create } from 'zustand'

export interface LfoConfig {
  enabled: boolean
  period: number
}

interface LfoState {
  configs: Record<string, LfoConfig>
  toggleLfo: (paramName: string) => void
  setLfoPeriod: (paramName: string, period: number) => void
}

export const useLfoStore = create<LfoState>((set, get) => ({
  configs: {},

  toggleLfo: (paramName) =>
    set((s) => {
      const existing = s.configs[paramName]
      return {
        configs: {
          ...s.configs,
          [paramName]: {
            enabled: !existing?.enabled,
            period: existing?.period ?? 4,
          },
        },
      }
    }),

  setLfoPeriod: (paramName, period) =>
    set((s) => ({
      configs: {
        ...s.configs,
        [paramName]: {
          enabled: s.configs[paramName]?.enabled ?? false,
          period,
        },
      },
    })),
}))
