import { LegacyProjectRow } from '@/types/legacyProject';

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

/**
 * Validate legacy project rows
 */
export function validateLegacyProjectRows(rows: LegacyProjectRow[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const emailSet = new Set<string>();
  
  rows.forEach((row, index) => {
    const rowNum = index + 3; // +3 for header, description, and 0-index offset
    
    // Required field validation
    if (!row.project_title || row.project_title.length === 0) {
      errors.push({ row: rowNum, field: 'project_title', message: 'Project title is required' });
    }
    
    if (!row.client_email || row.client_email.length === 0) {
      errors.push({ row: rowNum, field: 'client_email', message: 'Client email is required' });
    } else if (!isValidEmail(row.client_email)) {
      errors.push({ row: rowNum, field: 'client_email', message: 'Invalid email format' });
    }
    
    if (!row.client_first_name || row.client_first_name.length === 0) {
      errors.push({ row: rowNum, field: 'client_first_name', message: 'Client first name is required' });
    }
    
    if (!row.client_last_name || row.client_last_name.length === 0) {
      errors.push({ row: rowNum, field: 'client_last_name', message: 'Client last name is required' });
    }
    
    if (!row.system_address || row.system_address.length === 0) {
      errors.push({ row: rowNum, field: 'system_address', message: 'System address is required' });
    }
    
    if (!row.system_size_kwp || row.system_size_kwp <= 0) {
      errors.push({ row: rowNum, field: 'system_size_kwp', message: 'System size must be greater than 0' });
    }
    
    if (!row.commissioning_date || row.commissioning_date.length === 0) {
      errors.push({ row: rowNum, field: 'commissioning_date', message: 'Commissioning date is required' });
    } else if (!isValidDate(row.commissioning_date)) {
      errors.push({ row: rowNum, field: 'commissioning_date', message: 'Invalid date format (use YYYY-MM-DD)' });
    }
    
    if (!row.signed_date || row.signed_date.length === 0) {
      errors.push({ row: rowNum, field: 'signed_date', message: 'Signed date is required' });
    } else if (!isValidDate(row.signed_date)) {
      errors.push({ row: rowNum, field: 'signed_date', message: 'Invalid date format (use YYYY-MM-DD)' });
    }
    
    if (!row.agent_email || row.agent_email.length === 0) {
      errors.push({ row: rowNum, field: 'agent_email', message: 'Agent email is required' });
    } else if (!isValidEmail(row.agent_email)) {
      errors.push({ row: rowNum, field: 'agent_email', message: 'Invalid agent email format' });
    }
    
    // Duplicate email check
    if (row.client_email && emailSet.has(row.client_email)) {
      errors.push({ row: rowNum, field: 'client_email', message: 'Duplicate client email in upload' });
    }
    emailSet.add(row.client_email);
    
    // Optional field validation
    if (row.client_share_percentage !== undefined) {
      if (row.client_share_percentage < 0 || row.client_share_percentage > 100) {
        errors.push({ row: rowNum, field: 'client_share_percentage', message: 'Client share must be between 0 and 100' });
      }
    }
    
    if (row.agent_commission_percentage !== undefined) {
      if (row.agent_commission_percentage < 0 || row.agent_commission_percentage > 100) {
        errors.push({ row: rowNum, field: 'agent_commission_percentage', message: 'Agent commission must be between 0 and 100' });
      }
    }
  });
  
  return errors;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidDate(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}
