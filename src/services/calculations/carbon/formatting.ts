/**
 * Format system size for display
 */
export function formatSystemSize(sizeKwp: number, preferredUnit: 'auto' | 'kWp' | 'MWp' = 'auto'): string {
  if (preferredUnit === 'MWp' || (preferredUnit === 'auto' && sizeKwp >= 1000)) {
    return `${(sizeKwp / 1000).toFixed(3)} MWp`;
  }
  return `${parseFloat(sizeKwp.toFixed(3))} kWp`;
}