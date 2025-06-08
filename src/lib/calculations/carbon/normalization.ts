
// Normalization functions
export { normalizeToKWp, formatSystemSizeForDisplay } from './simplified';

export function formatSystemSizeForDisplay(systemSizeKWp: number): string {
  if (systemSizeKWp >= 1000) {
    return `${(systemSizeKWp / 1000).toFixed(2)} MWp`;
  }
  return `${systemSizeKWp.toFixed(1)} kWp`;
}
