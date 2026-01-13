
import { LeadRow, LeadValidationError, ParsedLeadData } from '@/types/leads';

/**
 * Simple email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Simple URL validation regex
 */
const URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;

/**
 * Validate a single lead row
 */
function validateRow(row: LeadRow, rowIndex: number): LeadValidationError[] {
  const errors: LeadValidationError[] = [];
  
  // Required: company_name
  if (!row.company_name || row.company_name.trim().length === 0) {
    errors.push({
      row: rowIndex,
      field: 'company_name',
      message: 'Company name is required'
    });
  }
  
  // Optional: email format validation
  if (row.email && row.email.trim().length > 0) {
    if (!EMAIL_REGEX.test(row.email)) {
      errors.push({
        row: rowIndex,
        field: 'email',
        message: `Invalid email format: ${row.email}`
      });
    }
  }
  
  // Optional: website URL format validation
  if (row.website && row.website.trim().length > 0) {
    if (!URL_REGEX.test(row.website)) {
      errors.push({
        row: rowIndex,
        field: 'website',
        message: `Invalid website URL format: ${row.website}`
      });
    }
  }
  
  return errors;
}

/**
 * Validate all lead rows
 */
export function validateLeads(rows: LeadRow[]): ParsedLeadData {
  const allErrors: LeadValidationError[] = [];
  const validRows: LeadRow[] = [];
  
  rows.forEach((row, index) => {
    // Row number is 1-indexed for display, +1 for header row
    const displayRowNumber = index + 2;
    const rowErrors = validateRow(row, displayRowNumber);
    
    if (rowErrors.length === 0) {
      validRows.push(row);
    } else {
      allErrors.push(...rowErrors);
    }
  });
  
  return {
    rows: validRows,
    errors: allErrors,
    isValid: allErrors.length === 0
  };
}

/**
 * Get summary of validation errors by type
 */
export function getErrorSummary(errors: LeadValidationError[]): Record<string, number> {
  const summary: Record<string, number> = {};
  
  errors.forEach(error => {
    const key = error.field;
    summary[key] = (summary[key] || 0) + 1;
  });
  
  return summary;
}
