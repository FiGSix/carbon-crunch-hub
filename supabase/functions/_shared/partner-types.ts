/**
 * Partner API Types
 * Shared type definitions for the Partner API v1
 */

// =============================================================================
// API Key & Authentication
// =============================================================================

export interface PartnerAuthInfo {
  partnerId: string;
  apiKeyId: string;
  apiKeyHash: string;
  environment: 'live' | 'test';
  scopes: string[];
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  partnerName: string;
  isActive: boolean;
}

export type ApiScope = 
  | 'proposals:create'
  | 'proposals:read'
  | 'proposals:send'
  | 'projects:read'
  | 'projects:onboarding:write'
  | 'projects:documents:write'
  | 'projects:data_access:write'
  | 'webhooks:manage'
  | 'clients:read';

// =============================================================================
// Request/Response Types
// =============================================================================

export interface PartnerApiRequest {
  method: string;
  path: string;
  body?: unknown;
  headers: Headers;
  requestId: string;
}

export interface PartnerApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: PartnerApiError;
  requestId: string;
}

export interface PartnerApiError {
  code: string;
  message: string;
  field?: string;
  received?: unknown;
  matches?: DuplicateMatch[];
}

export interface DuplicateMatch {
  proposal_id: string;
  status: string;
  created_at: string;
  partner_reference_id?: string;
}

// =============================================================================
// Proposal Types
// =============================================================================

export interface CreateProposalRequest {
  partner_reference_id?: string;
  client: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    company_name?: string;
  };
  project: {
    name?: string;
    address: string;
    country: 'ZA';
    gps_lat?: number;
    gps_lng?: number;
    system_size_kwp: number;
    commissioning_date: string;
    installer_company?: string;
    installer_email?: string;
  };
  consent: {
    obtained: true;
    source: string;
    timestamp?: string;
  };
  send_email?: boolean;
}

export interface CreateProposalResponse {
  proposal_id: string;
  client_id: string;
  partner_reference_id?: string;
  estimates: {
    credits_per_year: number;
    revenue_6yr_total: number;
    client_share_percentage: number;
  };
  acceptance_url: string;
  expires_at: string;
  email_sent: boolean;
  email_queued_at?: string;
}

export interface SendAcceptanceLinkRequest {
  redirect_url?: string;
  expires_in_days?: number;
  resend?: boolean;
}

export interface SendAcceptanceLinkResponse {
  proposal_id: string;
  acceptance_url: string;
  expires_at: string;
  email_sent: boolean;
  email_queued_at: string;
}

export interface ProposalListItem {
  proposal_id: string;
  partner_reference_id?: string;
  client_email: string;
  status: string;
  created_at: string;
  signed_at?: string;
  project_id?: string;
}

export interface ProposalListResponse {
  proposals: ProposalListItem[];
  pagination: {
    has_more: boolean;
    next_cursor?: string;
  };
}

// =============================================================================
// Project Types
// =============================================================================

export interface ProjectStatus {
  onboarding_complete: boolean;
  submitted_for_review: boolean;
  admin_validated: boolean;
  audit_ready: boolean;
}

export interface ProjectCompletion {
  fields_complete: number;
  fields_required: number;
  percentage: number;
  missing_fields: string[];
}

export interface ProjectDocuments {
  coc_uploaded: boolean;
  invoice_uploaded: boolean;
}

export interface ProjectDataAccess {
  configured: boolean;
  provider?: string;
  status?: 'pending' | 'verified' | 'failed';
}

export interface ProjectResponse {
  project_id: string;
  proposal_id: string;
  partner_reference_id?: string;
  version: number;
  status: ProjectStatus;
  completion: ProjectCompletion;
  documents: ProjectDocuments;
  data_access: ProjectDataAccess;
}

export interface UpdateOnboardingRequest {
  system?: {
    inverter_brand?: string;
    inverter_model?: string;
    inverter_serial?: string;
    inverter_capacity_kw?: number;
    inverter_quantity?: number;
    panel_brand?: string;
    panel_quantity?: number;
    panel_size_wp?: number;
    panel_total_kwp?: number;
    has_battery?: boolean;
    battery_brand?: string;
    battery_capacity_kwh?: number;
  };
  installation?: {
    total_capex?: number;
    ownership_type?: 'owned' | 'ppa' | 'lease';
    has_maintenance_agreement?: boolean;
    maintenance_cost_annual?: number;
  };
  installer?: {
    company_name?: string;
    email?: string;
  };
  location?: {
    address?: string;
    gps_lat?: number;
    gps_lng?: number;
  };
}

export interface UpdateOnboardingResponse {
  project_id: string;
  version: number;
  completion: ProjectCompletion;
  updated_fields: string[];
  skipped_fields: string[];
}

// =============================================================================
// Document Types
// =============================================================================

export type DocumentCategory = 'coc' | 'invoice' | 'installation_photo' | 'panel_layout' | 'other';

export interface DocumentPresignRequest {
  category: DocumentCategory;
  file_name: string;
  content_type: string;
  file_size_bytes: number;
  metadata?: {
    invoice_date?: string;
    invoice_total?: number;
    coc_number?: string;
    photo_description?: string;
  };
}

export interface DocumentPresignResponse {
  upload_url: string;
  upload_expires_at: string;
  document_id: string;
  upload_headers: {
    'Content-Type': string;
  };
}

export interface DocumentConfirmResponse {
  document_id: string;
  category: string;
  file_url: string;
  uploaded_at: string;
  virus_scan_status: 'pending' | 'clean' | 'infected';
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Data Access Types
// =============================================================================

export interface ConfigureDataAccessRequest {
  provider: string;
  credential_method: 'delegated_access' | 'api_key';
  site_id?: string;
  portal_url?: string;
  delegated_access?: {
    granted_by_email?: string;
    granted_by_role?: 'owner' | 'installer' | 'oem_support';
  };
  api_key?: string;
}

export interface ConfigureDataAccessResponse {
  data_access_id: string;
  provider: string;
  status: 'pending_verification';
  next_steps?: {
    delegated_email: string;
    instructions: string;
    instructions_url?: string;
  };
  instructions_sent: boolean;
}

// =============================================================================
// Webhook Types
// =============================================================================

export interface CreateWebhookRequest {
  url: string;
  events: string[];
  secret?: string;
}

export interface CreateWebhookResponse {
  webhook_id: string;
  events: string[];
  secret: string;
  verification_pending: boolean;
}

export interface WebhookDelivery {
  delivery_id: string;
  event: string;
  status: 'delivered' | 'failed' | 'pending';
  attempt: number;
  sent_at: string;
  response_status?: number;
  response_time_ms?: number;
  next_retry_at?: string;
}

export interface WebhookDeliveriesResponse {
  deliveries: WebhookDelivery[];
}

export type WebhookEvent = 
  | 'webhook.verification'
  | 'proposal.created'
  | 'proposal.viewed'
  | 'proposal.signed'
  | 'proposal.rejected'
  | 'proposal.expired'
  | 'project.onboarding_complete'
  | 'project.audit_ready'
  | 'data_access.verified';

// =============================================================================
// Client Types
// =============================================================================

export interface ClientProjectsResponse {
  client: {
    email: string;
    first_name: string;
    last_name: string;
    company_name?: string;
  };
  projects: Array<{
    project_id: string;
    proposal_id: string;
    partner_reference_id?: string;
    address: string;
    system_size_kwp: number;
    status: string;
    signed_at: string;
  }>;
  total_kwp: number;
}

// =============================================================================
// Error Codes
// =============================================================================

export const ERROR_CODES = {
  // Authentication
  UNAUTHORIZED: { code: 'UNAUTHORIZED', status: 401 },
  FORBIDDEN: { code: 'FORBIDDEN', status: 403 },
  SCOPE_INSUFFICIENT: { code: 'SCOPE_INSUFFICIENT', status: 403 },
  
  // Not Found
  NOT_FOUND: { code: 'NOT_FOUND', status: 404 },
  
  // Validation
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', status: 400 },
  CONSENT_REQUIRED: { code: 'CONSENT_REQUIRED', status: 400 },
  INVALID_COUNTRY: { code: 'INVALID_COUNTRY', status: 400 },
  SYSTEM_SIZE_OUT_OF_RANGE: { code: 'SYSTEM_SIZE_OUT_OF_RANGE', status: 400 },
  COMMISSIONING_TOO_EARLY: { code: 'COMMISSIONING_TOO_EARLY', status: 400 },
  INVALID_EMAIL: { code: 'INVALID_EMAIL', status: 400 },
  
  // Conflicts
  DUPLICATE_REFERENCE_ID: { code: 'DUPLICATE_REFERENCE_ID', status: 409 },
  DUPLICATE_PROPOSAL: { code: 'DUPLICATE_PROPOSAL', status: 409 },
  PROPOSAL_ALREADY_SIGNED: { code: 'PROPOSAL_ALREADY_SIGNED', status: 409 },
  CONCURRENCY_CONFLICT: { code: 'CONCURRENCY_CONFLICT', status: 412 },
  
  // Rate Limiting
  RATE_LIMITED: { code: 'RATE_LIMITED', status: 429 },
  
  // Server Errors
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', status: 500 },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
