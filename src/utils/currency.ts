/** Format a number as Indian-style rupees, e.g. 1234567 -> "₹12,34,567". */
export function formatINR(value: number, opts?: { decimals?: number }): string {
  const decimals = opts?.decimals ?? 0;
  const rounded = roundToFriendly(value, decimals);
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
  return formatter.format(rounded);
}

/** Format a range as "₹X – ₹Y". */
export function formatINRRange(min: number, max: number): string {
  if (Math.round(min) === Math.round(max)) return formatINR(min);
  return `${formatINR(min)} – ${formatINR(max)}`;
}

/**
 * Round to a "borrower-friendly" precision instead of exposing false
 * precision. Small amounts round to nearest 100, larger ones to nearest
 * 1,000 or 10,000.
 */
export function roundToFriendly(value: number, decimals = 0): number {
  if (decimals > 0) return Math.round(value * 10 ** decimals) / 10 ** decimals;
  const abs = Math.abs(value);
  let nearest = 1;
  if (abs >= 1_00_00_000) nearest = 50_000;
  else if (abs >= 10_00_000) nearest = 10_000;
  else if (abs >= 1_00_000) nearest = 1_000;
  else if (abs >= 10_000) nearest = 100;
  else if (abs >= 1_000) nearest = 50;
  else nearest = 10;
  return Math.round(value / nearest) * nearest;
}
