/**
 * Date validation utilities for proposal creation
 */

export const MINIMUM_COMMISSION_DATE = new Date('2022-09-15');

/**
 * Validates if a commission date meets the minimum requirements
 * @param dateString - The date string to validate (YYYY-MM-DD format)
 * @returns Object with validation result and error message
 */
export function validateCommissionDate(dateString: string): {
  isValid: boolean;
  error?: string;
} {
  if (!dateString) {
    return { isValid: false, error: 'Commission date is required' };
  }

  const commissionDate = new Date(dateString);
  
  // Check if the date is valid
  if (isNaN(commissionDate.getTime())) {
    return { isValid: false, error: 'Invalid date format' };
  }

  // Check if the date is before the minimum allowed date
  if (commissionDate < MINIMUM_COMMISSION_DATE) {
    return { 
      isValid: false, 
      error: 'This project does not qualify due to date constraints. Please contact the support team.' 
    };
  }

  return { isValid: true };
}

/**
 * Formats the minimum date for display
 */
export function getMinimumDateString(): string {
  return MINIMUM_COMMISSION_DATE.toISOString().split('T')[0];
}