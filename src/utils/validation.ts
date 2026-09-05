/** Clamp a possibly invalid (negative/NaN/undefined) number to a safe floor. */
export function safeNonNegative(value: number | undefined | null, fallback = 0): number {
  if (value === undefined || value === null || Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, value);
}

/** True if a number is a usable positive finite value. */
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
