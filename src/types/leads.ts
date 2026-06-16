
/**
 * Type definitions for lead import functionality
 */

export interface LeadRow {
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  location?: string;
  source?: string;
  notes?: string;
}

export interface LeadValidationError {
  row: number;
  field: string;
  message: string;
}

export interface LeadImportResult {
  totalRows: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ row: number; error: string }>;
}

export interface ParsedLeadData {
  rows: LeadRow[];
  errors: LeadValidationError[];
  isValid: boolean;
}
