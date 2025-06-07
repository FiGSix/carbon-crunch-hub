
/**
 * System size normalization and formatting functions
 */

/**
 * Normalize system size to kWp regardless of input unit
 * 
 * @param systemSize - Solar system size (string or number)
 * @param unit - Unit type ('kWp', 'MWp', or auto-detect from string)
 */
export function normalizeToKWp(systemSize: string | number, unit?: string): number {
  if (typeof systemSize === 'string') {
    // Try to extract unit from string if not provided
    const sizeStr = systemSize.toLowerCase().trim();
    const numericValue = parseFloat(sizeStr);
    
    if (isNaN(numericValue)) return 0;
    
    // Auto-detect unit from string
    if (sizeStr.includes('mwp') || sizeStr.includes('mw')) {
      return numericValue * 1000; // Convert MWp to kWp
    } else {
      return numericValue; // Assume kWp
    }
  }
  
  const sizeValue = typeof systemSize === 'number' ? systemSize : parseFloat(systemSize);
  if (isNaN(sizeValue)) return 0;
  
  // Apply unit conversion if specified
  if (unit) {
    switch (unit.toLowerCase()) {
      case 'mwp':
      case 'mw':
        return sizeValue * 1000;
      default:
        return sizeValue;
    }
  }
  
  return sizeValue;
}

/**
 * Format system size for display with appropriate unit
 * 
 * @param sizeInKWp - System size in kWp
 * @param preferredUnit - Preferred display unit ('auto', 'kWp', 'MWp')
 */
export function formatSystemSizeForDisplay(sizeInKWp: number, preferredUnit: string = 'auto'): string {
  if (isNaN(sizeInKWp) || sizeInKWp <= 0) return '0 kWp';
  
  switch (preferredUnit.toLowerCase()) {
    case 'kwp':
    case 'kw':
      return `${sizeInKWp.toLocaleString()} kWp`;
    case 'mwp':
    case 'mw':
      return `${(sizeInKWp / 1000).toFixed(2)} MWp`;
    case 'auto':
    default:
      if (sizeInKWp >= 1000) {
        return `${(sizeInKWp / 1000).toFixed(2)} MWp`;
      } else {
        return `${sizeInKWp.toLocaleString()} kWp`;
      }
  }
}
