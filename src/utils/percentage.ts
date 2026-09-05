/** Format a percentage to one decimal place, e.g. 11 -> "11.0%". */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/** Format a percentage range, collapsing to a single value when they round the same. */
export function formatPercentRange(min: number, max: number): string {
  if (min.toFixed(1) === max.toFixed(1)) return formatPercent(min);
  return `${formatPercent(min)} – ${formatPercent(max)}`;
}

export function clampPercent(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}
