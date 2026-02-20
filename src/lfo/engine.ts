export type LfoShape = 'sine' | 'triangle' | 'square' | 'sawtooth' | 'noise' | 'perlin'
export type SpeedMode = 'bpm' | 'hz'
export type Divider = number

export const DIVIDER_OPTIONS: { value: number; label: string }[] = [
  { value: 1/16, label: '1/16' },
  { value: 1/8, label: '1/8' },
  { value: 1/4, label: '1/4' },
  { value: 1/3, label: '1/3' },
  { value: 1/2, label: '1/2' },
  { value: 2/3, label: '2/3' },
  { value: 1, label: '1' },
  { value: 3/2, label: '3/2' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 8, label: '8' },
  { value: 16, label: '16' },
]

export type LfoParamName = 'hz' | 'drive' | 'symmetry'

export const LFO_PARAM_RANGES: Record<LfoParamName, { min: number; max: number; step: number }> = {
  hz: { min: 0.01, max: 20, step: 0.01 },
  drive: { min: 0, max: 1, step: 0.01 },
  symmetry: { min: 0, max: 1, step: 0.01 },
}

export interface LfoDefinition {
  shape: LfoShape
  bipolar: boolean
  speedMode: SpeedMode
  hz: number
  divider: Divider
  drive: number     // 0–1: waveshaping drive (0=clean, 1=hard clip)
  symmetry: number  // 0–1: waveform symmetry (0.5=centered)
  randomFreq: boolean // S&H: random hold times using musical subdivisions
}

// Per-LFO noise state (keyed by lfoId string)
const _noiseState = new Map<string, { phaseFloor: number; value: number }>()

function sampleNoise(phase: number, lfoId = '_default'): number {
  const floor = Math.floor(phase)
  let state = _noiseState.get(lfoId)
  if (!state || floor !== state.phaseFloor) {
    const seed = (floor * 1103515245 + 12345) & 0x7fffffff
    state = { phaseFloor: floor, value: (seed / 0x7fffffff) * 2 - 1 }
    _noiseState.set(lfoId, state)
  }
  return state.value
}

// Musical subdivisions for random freq S&H (in phase units = LFO cycles)
const RANDOM_DIVISIONS = [1/16, 1/8, 1/4, 1/3, 1/2, 2/3, 1, 3/2, 2, 3, 4]

// Per-LFO random-freq state
const _randomNoiseState = new Map<string, {
  value: number
  nextChange: number  // phase at which next value change occurs
  seed: number
}>()

function pickRandomDivision(seed: number): number {
  const idx = ((seed * 48271) & 0x7fffffff) % RANDOM_DIVISIONS.length
  return RANDOM_DIVISIONS[idx]
}

function sampleRandomNoise(phase: number, lfoId: string): number {
  let state = _randomNoiseState.get(lfoId)
  if (!state) {
    const seed = Math.floor(phase * 1000) ^ 0xDEAD
    const val = ((seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff * 2 - 1
    state = { value: val, nextChange: phase + pickRandomDivision(seed), seed }
    _randomNoiseState.set(lfoId, state)
  }
  if (phase >= state.nextChange) {
    const newSeed = (state.seed * 1103515245 + 12345) & 0x7fffffff
    state.value = (newSeed / 0x7fffffff) * 2 - 1
    state.seed = newSeed
    const interval = pickRandomDivision(newSeed)
    // Snap nextChange forward from the trigger point (not current phase) to keep rhythm
    state.nextChange = state.nextChange + interval
    // Safety: if we fell far behind, catch up
    if (state.nextChange < phase) state.nextChange = phase + interval
  }
  return state.value
}

/** 1D Perlin noise: smooth continuous random in ~[-1, 1] */
function perlinHash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123
  return (x - Math.floor(x)) * 2 - 1
}

function perlinNoise(x: number): number {
  const xi = Math.floor(x)
  const xf = x - xi
  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10) // quintic smoothstep
  const d0 = perlinHash(xi) * xf
  const d1 = perlinHash(xi + 1) * (xf - 1)
  return Math.max(-1, Math.min(1, (d0 + u * (d1 - d0)) * 2))
}

/** Ramp wave: symmetry=0→ramp up, 0.5→triangle, 1→ramp down */
function rampWave(p: number, sym: number): number {
  // Clamp sym to avoid division by zero
  const s = Math.max(0.001, Math.min(0.999, sym))
  if (p < s) {
    return (p / s) * 2 - 1  // rise: -1 to +1
  } else {
    return 1 - ((p - s) / (1 - s)) * 2  // fall: +1 to -1
  }
}

/** Apply drive: gain 1–10x with hard clip to [-1,1] */
function applyDrive(value: number, drive: number): number {
  if (drive <= 0) return value
  const gain = 1 + drive * 9
  return Math.max(-1, Math.min(1, value * gain))
}

/**
 * Compute shaped waveform value in [-1, 1].
 * Single source of truth for all wave generation.
 */
export function shapedWave(shape: LfoShape, phase: number, drive: number, symmetry: number, lfoId = '_default', randomFreq = false): number {
  const p = ((phase % 1) + 1) % 1  // fractional part [0, 1), handle negatives
  let raw: number
  switch (shape) {
    case 'sine':
      raw = Math.sin(p * 2 * Math.PI)
      break
    case 'triangle':
      raw = rampWave(p, symmetry)
      break
    case 'square':
      raw = p < symmetry ? 1 : -1  // PWM: symmetry controls pulse width
      break
    case 'sawtooth':
      raw = rampWave(p, symmetry)
      break
    case 'noise':
      raw = randomFreq ? sampleRandomNoise(phase, lfoId) : sampleNoise(phase, lfoId)
      break
    case 'perlin':
      raw = perlinNoise(phase)
      break
  }
  return applyDrive(raw, drive)
}

/**
 * Compute LFO output value.
 * Returns a value that should be applied relative to the param's base value:
 * - bipolar: returns [-strength, +strength] centered around 0
 * - unipolar: returns [0, strength] range
 */
export function computeLfo(lfo: LfoDefinition, bpm: number, timeSec: number, lfoId = '_default', phaseMul = 1): number {
  // Calculate phase based on speed mode
  let phase: number
  if (lfo.speedMode === 'hz') {
    phase = timeSec * lfo.hz * phaseMul
  } else {
    // BPM mode: phase = time * (bpm/60) * divider * phaseMul
    phase = timeSec * (bpm / 60) * lfo.divider * phaseMul
  }

  const raw = shapedWave(lfo.shape, phase, lfo.drive, lfo.symmetry, lfoId, lfo.randomFreq)  // -1 to 1

  if (lfo.bipolar) {
    return raw  // [-1, 1]
  } else {
    return (raw + 1) / 2  // [0, 1]
  }
}

export function createDefaultLfo(): LfoDefinition {
  return {
    shape: 'sine',
    bipolar: false,
    speedMode: 'bpm',
    hz: 1,
    divider: 1,
    drive: 0,
    symmetry: 0.5,
    randomFreq: false,
  }
}
