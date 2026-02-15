export interface CcMessage {
  channel: number
  cc: number
  value: number
}

export function parseCc(data: Uint8Array): CcMessage | null {
  if (data.length < 3) return null
  const status = data[0]
  // CC messages: 0xB0-0xBF
  if ((status & 0xf0) !== 0xb0) return null
  return {
    channel: status & 0x0f,
    cc: data[1],
    value: data[2],
  }
}

/** Absolute mode: map 0-127 to param range */
export function normalizeCc(value: number, min: number, max: number): number {
  return min + (value / 127) * (max - min)
}

/**
 * Relative mode (2's complement around 64):
 *   64 = no change (reset pulse, skip)
 *   <64 = decrement by (64 - value)
 *   >64 = increment by (value - 64)
 * Returns null for value=64 so the caller can skip it.
 */
export function applyRelativeCc(
  ccValue: number,
  currentValue: number,
  min: number,
  max: number,
): number | null {
  if (ccValue === 64) return null // reset pulse — ignore
  const delta = ccValue - 64
  const step = (max - min) / 127
  const next = currentValue + delta * step
  return Math.max(min, Math.min(max, next))
}
