export type LfoShape = 'sine' | 'triangle' | 'square' | 'sawtooth' | 'noise'
export type SpeedMode = 'bpm' | 'hz'
export type Divider = 0.25 | 0.5 | 1 | 2 | 4

export interface LfoDefinition {
  shape: LfoShape
  strength: number  // 0–1
  bipolar: boolean
  speedMode: SpeedMode
  hz: number
  divider: Divider
}

// Noise: sample-and-hold per cycle
let _noiseSeed = 0
let _noisePhaseFloor = -1
let _noiseValue = 0

function sampleNoise(phase: number): number {
  const floor = Math.floor(phase)
  if (floor !== _noisePhaseFloor) {
    _noisePhaseFloor = floor
    // Simple deterministic hash from phase
    _noiseSeed = (floor * 1103515245 + 12345) & 0x7fffffff
    _noiseValue = (_noiseSeed / 0x7fffffff) * 2 - 1  // -1 to 1
  }
  return _noiseValue
}

/** Compute raw waveform value in [-1, 1] */
function rawWave(shape: LfoShape, phase: number): number {
  const p = phase % 1  // fractional part [0, 1)
  switch (shape) {
    case 'sine':
      return Math.sin(p * 2 * Math.PI)
    case 'triangle':
      return p < 0.5 ? (4 * p - 1) : (3 - 4 * p)
    case 'square':
      return p < 0.5 ? 1 : -1
    case 'sawtooth':
      return 2 * p - 1
    case 'noise':
      return sampleNoise(phase)
  }
}

/**
 * Compute LFO output value.
 * Returns a value that should be applied relative to the param's base value:
 * - bipolar: returns [-strength, +strength] centered around 0
 * - unipolar: returns [0, strength] range
 */
export function computeLfo(lfo: LfoDefinition, bpm: number, timeSec: number): number {
  // Calculate phase based on speed mode
  let phase: number
  if (lfo.speedMode === 'hz') {
    phase = timeSec * lfo.hz
  } else {
    // BPM mode: phase = time * (bpm/60) * divider
    phase = timeSec * (bpm / 60) * lfo.divider
  }

  const raw = rawWave(lfo.shape, phase)  // -1 to 1

  if (lfo.bipolar) {
    // Oscillate ± around center: raw * strength
    return raw * lfo.strength
  } else {
    // Remap [-1,1] to [0,1], then scale by strength
    return ((raw + 1) / 2) * lfo.strength
  }
}

export function createDefaultLfo(): LfoDefinition {
  return {
    shape: 'sine',
    strength: 0.5,
    bipolar: false,
    speedMode: 'bpm',
    hz: 1,
    divider: 1,
  }
}
