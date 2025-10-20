import { BulkProposalRow } from '@/types/proposals';

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

/**
 * Validate parsed proposal rows
 */
export function validateProposalRows(rows: BulkProposalRow[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const emailsSeen = new Set<string>();
  
  rows.forEach((row, idx) => {
    const rowNum = idx + 3; // Account for header and description rows
    
    // Required fields
    if (!row.proposal_title) {
      errors.push({ row: rowNum, field: 'proposal_title', message: 'Proposal title is required' });
    }
    
    if (!row.client_email) {
      errors.push({ row: rowNum, field: 'client_email', message: 'Client email is required' });
    } else if (!isValidEmail(row.client_email)) {
      errors.push({ row: rowNum, field: 'client_email', message: 'Invalid email format' });
    } else {
      // Check for duplicates within the file
      if (emailsSeen.has(row.client_email)) {
        errors.push({ row: rowNum, field: 'client_email', message: 'Duplicate email in file (will reuse same client)' });
      }
      emailsSeen.add(row.client_email);
    }
    
    if (!row.client_first_name) {
      errors.push({ row: rowNum, field: 'client_first_name', message: 'Client first name is required' });
    }
    
    if (!row.client_last_name) {
      errors.push({ row: rowNum, field: 'client_last_name', message: 'Client last name is required' });
    }
    
    if (!row.project_name) {
      errors.push({ row: rowNum, field: 'project_name', message: 'Project name is required' });
    }
    
    if (!row.project_address) {
      errors.push({ row: rowNum, field: 'project_address', message: 'Project address is required' });
    }
    
    // System size validation
    if (!row.system_size || row.system_size <= 0) {
      errors.push({ row: rowNum, field: 'system_size', message: 'System size must be greater than 0' });
    }
    
    if (!['kWp', 'MWp'].includes(row.system_size_unit)) {
      errors.push({ row: rowNum, field: 'system_size_unit', message: 'System size unit must be kWp or MWp' });
    }
    
    // Commission date validation
    if (!row.commission_date) {
      errors.push({ row: rowNum, field: 'commission_date', message: 'Commission date is required' });
    } else if (!isValidDate(row.commission_date)) {
      errors.push({ row: rowNum, field: 'commission_date', message: 'Invalid date format (use YYYY-MM-DD)' });
    } else {
      const commissionYear = new Date(row.commission_date).getFullYear();
      if (commissionYear < 2022) {
        errors.push({ row: rowNum, field: 'commission_date', message: 'Commission date must be 2022 or later' });
      }
    }
    
    // Eligibility criteria - all must be true
    if (!row.in_south_africa) {
      errors.push({ row: rowNum, field: 'in_south_africa', message: 'Must be in South Africa (Yes required)' });
    }
    
    if (!row.not_registered) {
      errors.push({ row: rowNum, field: 'not_registered', message: 'Must not be registered (Yes required)' });
    }
    
    if (!row.under_15mwp) {
      errors.push({ row: rowNum, field: 'under_15mwp', message: 'Must be under 15 MWp (Yes required)' });
    }
    
    if (!row.commissioned_after_2022) {
      errors.push({ row: rowNum, field: 'commissioned_after_2022', message: 'Must be commissioned after 2022 (Yes required)' });
    }
    
    if (!row.legal_ownership) {
      errors.push({ row: rowNum, field: 'legal_ownership', message: 'Must have legal ownership (Yes required)' });
    }
    
    // Optional override validations
    if (row.client_share_override !== undefined) {
      if (row.client_share_override < 0 || row.client_share_override > 100) {
        errors.push({ row: rowNum, field: 'client_share_override', message: 'Client share override must be between 0 and 100' });
      }
    }
    
    if (row.agent_commission_override !== undefined) {
      if (row.agent_commission_override < 0 || row.agent_commission_override > 100) {
        errors.push({ row: rowNum, field: 'agent_commission_override', message: 'Agent commission override must be between 0 and 100' });
      }
    }
  });
  
  return errors;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate date format (YYYY-MM-DD)
 */
function isValidDate(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}
