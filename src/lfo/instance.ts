import { createLfoEngine } from '@almst/lfo'

/** Shared LFO engine instance for the app. Scoped noise state. */
export const lfoEngine = createLfoEngine()
