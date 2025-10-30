/**
 * Types for legacy project bulk upload
 */

export interface LegacyProjectRow {
  // Required fields
  project_title: string;
  client_email: string;
  client_first_name: string;
  client_last_name: string;
  system_address: string;
  system_size_kwp: number;
  commissioning_date: string; // YYYY-MM-DD
  signed_date: string; // YYYY-MM-DD
  agent_email: string; // To find/assign agent
  
  // Optional client fields
  client_phone?: string;
  client_company_name?: string;
  
  // Optional system metadata
  inverter_brand?: string;
  inverter_model?: string;
  inverter_capacity_kw?: number;
  inverter_quantity?: number;
  inverter_serial?: string;
  panel_brand?: string;
  panel_size_wp?: number;
  panel_quantity?: number;
  battery_capacity_kwh?: number;
  battery_brand?: string;
  battery_model?: string;
  total_capex?: number;
  
  // Optional revenue overrides
  client_share_percentage?: number;
  agent_commission_percentage?: number;
}

export interface LegacyProjectUploadResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  failureCount: number;
  errors: Array<{
    row: number;
    data: Partial<LegacyProjectRow>;
    error: string;
  }>;
  createdProjectIds: string[];
  createdProposalIds: string[];
}
