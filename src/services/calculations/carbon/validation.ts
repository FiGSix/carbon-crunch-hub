import { ValidationResult } from './types';

/**
 * Normalize system size to kWp
 */
export function normalizeToKWp(systemSize: string | number, unit?: string): number {
  if (typeof systemSize === 'string') {
    const sizeStr = systemSize.toLowerCase().trim();
    const numericValue = parseFloat(sizeStr);
    
    if (isNaN(numericValue)) return 0;
    
    if (sizeStr.includes('mwp') || sizeStr.includes('mw')) {
      return numericValue * 1000;
    }
    return numericValue;
  }
  
  const sizeValue = typeof systemSize === 'number' ? systemSize : parseFloat(systemSize);
  if (isNaN(sizeValue)) return 0;
  
  // Check unit parameter
  if (unit?.toLowerCase().includes('mw')) {
    return sizeValue * 1000;
  }
  
  return sizeValue;
}

/**
 * Validate system size constraints
 */
export function validateSystemSize(sizeKwp: number): ValidationResult {
  if (sizeKwp <= 0) {
    return {
      isValid: false,
      error: 'System size must be greater than 0 kWp'
    };
  }

  if (sizeKwp > 15000) {
    return {
      isValid: false,
      error: 'System size cannot exceed 15,000 kWp (15 MWp)'
    };
  }

  return { isValid: true };
}