
import { Json } from "@/types/supabase";

/**
 * Base database record structure from Supabase
 * This represents the raw data structure as it exists in the database
 */
export interface ProposalDbRecord {
  id: string;
  created_at: string;
  title: string;
  client_id: string | null;
  client_reference_id: string | null;
  agent_id: string | null;
  status: string;
  content: Json;
  signed_at: string | null;
  archived_at: string | null;
  archived_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  review_later_until: string | null;
  invitation_sent_at: string | null;
  invitation_viewed_at: string | null;
  invitation_expires_at: string | null;
  invitation_token: string | null;
  annual_energy: number | null;
  carbon_credits: number | null;
  client_share_percentage: number | null;
  agent_commission_percentage: number | null;
  agent_portfolio_kwp: number | null;
  eligibility_criteria: Json;
  project_info: Json;
}

/**
 * Client and Project information structures
 * These represent the typed structure of the content JSON field
 */
export interface ClientInformation {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  existingClient: boolean;
  address?: string; // Added address field as optional
}

export interface ProjectInformation {
  name: string;
  address: string;
  size: string;
  commissionDate: string;
  additionalNotes: string;
}

export interface EligibilityCriteria {
  inSouthAfrica: boolean;
  notRegistered: boolean;
  under15MWp: boolean;
  commissionedAfter2022: boolean;
  legalOwnership: boolean;
}

/**
 * Calculation metadata for transparency
 */
export interface CalculationMetadata {
  portfolioBasedPricing: boolean;
  portfolioSize: number;
  calculatedAt: string;
  carbonPricesUsed: Record<string, number>;
}

export interface ProposalContent {
  clientInfo: ClientInformation;
  projectInfo: ProjectInformation;
  portfolioSize?: number; // Store portfolio size for transparency
  revenue?: Record<string, number>; // Legacy field - kept for backward compatibility
  marketRevenue?: Record<string, number>; // Market-rate revenue breakdown
  clientSpecificRevenue?: Record<string, number>; // Client-specific revenue breakdown (what client actually gets)
  agentCommissionRevenue?: Record<string, number>; // Agent commission by year
  crunchCommissionRevenue?: Record<string, number>; // Crunch Carbon commission by year
  calculationMetadata?: CalculationMetadata; // Metadata about how calculations were performed
}

/**
 * Enriched proposal data for application use
 * This represents the proposal data after processing for use in components
 */
export interface ProposalData {
  id: string;
  title: string;
  status: string;
  content: ProposalContent;
  created_at: string;
  signed_at?: string | null;
  archived_at?: string | null;
  deleted_at?: string | null;
  review_later_until?: string | null;
  client_id?: string | null;
  client_reference_id?: string | null;
  agent_id?: string | null;
  annual_energy?: number | null;
  carbon_credits?: number | null;
  client_share_percentage?: number | null;
  agent_commission_percentage?: number | null;
  agent_portfolio_kwp?: number | null;
  system_size_kwp?: number | null;
  unit_standard?: string | null;
  invitation_token?: string | null;
  invitation_expires_at?: string | null;
  invitation_sent_at?: string | null;
  invitation_viewed_at?: string | null;
}

/**
 * Simplified proposal representation for list views
 * Updated to match what's actually used in ProposalList component
 */
export interface ProposalListItem {
  id: string;
  name: string;
  client: string;
  date: string;
  size: number;
  status: string;
  revenue: number;
  created_at: string;
  title: string;
  signed_at?: string | null;
  archived_at?: string | null;
  review_later_until?: string | null;
  client_id?: string | null;
  client_reference_id?: string | null;
  agent_id?: string | null;
  client_name?: string;
  client_email?: string;
  agent_name?: string;
  annual_energy?: number | null;
  carbon_credits?: number | null;
  client_share_percentage?: number | null;
  agent_commission_percentage?: number | null;
  agent_portfolio_kwp?: number | null;
  invitation_sent_at?: string | null;
  invitation_viewed_at?: string | null;
  invitation_expires_at?: string | null;
  system_size_kwp?: number | null;
  agent?: string;
  content?: ProposalContent; // Add content property to fix build errors
}

/**
 * Interface for the details view components
 */
export interface ProposalDetailsProps {
  proposal: ProposalData;
  token?: string | null;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  isReviewLater?: boolean;
  showActions?: boolean;
}

/**
 * Operation result interfaces
 */
export interface ProposalOperationResult {
  success: boolean;
  error?: string;
  [key: string]: any;
}

/**
 * Form step types
 */
export type FormStep = "eligibility" | "client" | "project" | "summary";

/**
 * Proposal filters for listing
 */
export interface ProposalFilters {
  search: string;
  status: string;
  sort: string;
}

/**
 * Props interface for the proposal list component
 */
export interface ProposalListProps {
  proposals: ProposalListItem[];
  onProposalUpdate?: () => void;
}
