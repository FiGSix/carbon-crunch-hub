export interface ProjectOnboarding {
  id: string;
  proposal_id: string;
  created_at: string;
  updated_at: string;
  last_modified_by: string | null;
  onboarding_complete: boolean;
  data_access_verified: boolean;
  audit_ready: boolean;
  audit_ready_marked_by: string | null;
  audit_ready_marked_at: string | null;
  onboarding_completed_at: string | null;
  data_access_verified_at: string | null;
  assigned_epc_id: string | null;
}

export interface OnboardingFields {
  id: string;
  project_id: string;
  // System Details
  system_address: string | null;
  system_gps_lat: number | null;
  system_gps_lng: number | null;
  commissioning_date: string | null;
  // Inverter Details
  inverter_model: string | null;
  inverter_capacity_kw: number | null;
  inverter_serial: string | null;
  inverter_cost: number | null;
  // Battery Details
  battery_model: string | null;
  battery_capacity_kwh: number | null;
  battery_serial: string | null;
  battery_cost: number | null;
  // Panel Details
  panel_brand: string | null;
  panel_size_wp: number | null;
  panel_quantity: number | null;
  panel_cost: number | null;
  // Financial
  total_capex: number | null;
  labor_cost: number | null;
  // Metering
  meter_serial: string | null;
  meter_type: string | null;
  // O&M
  maintenance_agreement_term_years: number | null;
  maintenance_cost_annual: number | null;
  // Metadata
  created_at: string;
  updated_at: string;
  validated_at: string | null;
  validated_by: string | null;
}

export interface OnboardingDocument {
  id: string;
  project_id: string;
  category: 'coc' | 'invoice' | 'calibration_cert' | 'om_agreement' | 'meter_cert' | 'other';
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  version: number;
  replaces_doc_id: string | null;
  uploaded_by: string;
  uploaded_at: string;
  is_validated: boolean;
  validated_by: string | null;
  validated_at: string | null;
  validation_notes: string | null;
}

export interface DataAccessConfig {
  id: string;
  project_id: string;
  provider: string;
  site_id: string | null;
  portal_url: string | null;
  credential_method: 'delegated_account' | 'api_key' | 'readonly_user';
  delegated_email: string | null;
  api_key_encrypted: string | null;
  readonly_username: string | null;
  last_test_status: 'success' | 'failed' | 'pending' | null;
  last_test_at: string | null;
  last_test_error: string | null;
  first_data_ingested_at: string | null;
  created_at: string;
  updated_at: string;
  configured_by: string | null;
}

export interface OnboardingTask {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  category: 'upload_doc' | 'fill_field' | 'verify_access' | 'other';
  related_field: string | null;
  related_doc_category: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  due_date: string | null;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingActivityLog {
  id: string;
  project_id: string;
  actor_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, any>;
  old_value: string | null;
  new_value: string | null;
  mentioned_users: string[] | null;
  created_at: string;
  ip_address: string | null;
}

export interface OnboardingComment {
  id: string;
  project_id: string;
  author_id: string;
  content: string;
  mentioned_users: string[] | null;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string | null;
  edited_by: string | null;
}

export type StepStatus = 'green' | 'orange' | 'grey';

export interface ProjectStepStatus {
  cession_status: StepStatus;
  onboarding_status: StepStatus;
  data_access_status: StepStatus;
  audit_ready_status: StepStatus;
}

export interface ProjectOnboardingListItem {
  id: string;
  proposal_id: string;
  proposal_title: string;
  client_name: string;
  site_address: string | null;
  updated_at: string;
  step_status: ProjectStepStatus;
}
