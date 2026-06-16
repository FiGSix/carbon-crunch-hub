/**
 * Comprehensive API types for improved type safety
 */

import { Database } from "@/integrations/supabase/types";

// Base API Response types
export interface ApiError {
  code?: string;
  message: string;
  details?: string | null;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  success: boolean;
}

// Database table types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type Proposal = Database['public']['Tables']['proposals']['Row'];
export type ProposalInsert = Database['public']['Tables']['proposals']['Insert'];
export type ProposalUpdate = Database['public']['Tables']['proposals']['Update'];

export type Client = Database['public']['Tables']['clients']['Row'];
export type ClientInsert = Database['public']['Tables']['clients']['Insert'];
export type ClientUpdate = Database['public']['Tables']['clients']['Update'];

export type AgentCommission = Database['public']['Tables']['agent_commissions']['Row'];
export type AgentActivity = Database['public']['Tables']['agent_activities']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];

// User roles with strict typing
export type UserRole = 'client' | 'agent' | 'admin';

// Proposal status with strict typing
// Removed 'pending' - proposals now use explicit status lifecycle
export type ProposalStatus = 
  | 'draft'      // Created, not yet sent
  | 'sent'       // Email dispatched
  | 'delivered'  // Email confirmed delivered
  | 'opened'     // Client opened email
  | 'viewed'     // Client viewed proposal
  | 'stale'      // 10 working days no activity
  | 'approved'   // Client accepted
  | 'rejected'   // Client declined
  | 'signed'     // Cession agreement signed
  | 'bounced'    // Email bounced
  | 'archived'   // Manually archived
  | 'deleted';   // Soft deleted

// Agent status with strict typing
export type AgentStatus = 'pending_approval' | 'active' | 'inactive' | 'suspended';

// Agent access level with strict typing
export type AgentAccessLevel = 'standard' | 'premium' | 'admin';

// Error severity levels
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'fatal';

// Common form field types
export interface FormField<T = string> {
  value: T;
  error?: string;
  isValid: boolean;
  isDirty: boolean;
}

// Query result types
export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Search types
export interface SearchParams {
  query: string;
  filters?: Record<string, unknown>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

// File upload types
export interface FileUploadResult {
  url: string;
  path: string;
  size: number;
  type: string;
}

// Chart/Dashboard data types
export interface ChartDataPoint {
  name: string;
  value: number;
  label?: string;
  color?: string;
}

export interface DashboardStats {
  totalProposals: number;
  activeProposals: number;
  signedProposals: number;
  totalCarbonCredits: number;
  totalRevenue: number;
  portfolioSizeKwp: number;
}

// Client data types
export interface ClientData {
  id: string;
  name: string;
  email: string;
  companyName?: string;
  isRegistered: boolean;
  projectCount: number;
  totalMwp: number;
  createdAt: string;
}

// Agent data types
export interface AgentData {
  id: string;
  name: string;
  email: string;
  companyName?: string;
  status: AgentStatus;
  accessLevel: AgentAccessLevel;
  commissionOverride?: number;
  lastActiveAt?: string;
  totalProposals: number;
  activeProposals: number;
  signedProposals: number;
  totalCommission: number;
  joinDate?: string;
  onboardingCompleted: boolean;
}

// Proposal list item type
export interface ProposalListItem {
  id: string;
  title: string;
  status: ProposalStatus;
  createdAt: string;
  agentId: string;
  clientId?: string;
  clientReferenceId?: string;
  carbonCredits?: number;
  systemSizeKwp?: number;
  invitationSentAt?: string;
  invitationViewedAt?: string;
}

// Content types for proposals
export interface ProposalContent {
  clientInfo: {
    name: string;
    email: string;
    company?: string;
    phone?: string;
  };
  projectInfo: {
    address?: string;
    systemSize?: number;
    description?: string;
  };
  [key: string]: unknown;
}

// Validation types
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => string | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Event types for realtime subscriptions
export interface RealtimeEvent<T = unknown> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
  schema: string;
  table: string;
}

// Performance monitoring types
export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage?: number;
  networkRequests: number;
}

// Address autocomplete types
export interface AddressPrediction {
  placeId: string;
  description: string;
  structuredFormatting: {
    mainText: string;
    secondaryText: string;
  };
}

export interface AddressComponents {
  streetNumber?: string;
  route?: string;
  locality?: string;
  administrativeAreaLevel1?: string;
  country?: string;
  postalCode?: string;
}