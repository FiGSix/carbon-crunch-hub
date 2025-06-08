
/**
 * Centralized types for proposal hooks and operations
 */

export interface ProposalFilters {
  search: string;
  status: string;
  sort: string;
}

export interface RawProposalData {
  id: string;
  title: string;
  status: string;
  created_at: string;
  signed_at?: string | null;
  archived_at?: string | null;
  deleted_at?: string | null;
  review_later_until?: string | null;
  client_id?: string | null;
  client_reference_id?: string | null;
  agent_id: string;
  content: any;
  annual_energy?: number | null;
  carbon_credits?: number | null;
  client_share_percentage?: number | null;
  agent_commission_percentage?: number | null;
  system_size_kwp?: number | null;
  unit_standard?: string | null;
  invitation_sent_at?: string | null;
  invitation_viewed_at?: string | null;
  invitation_expires_at?: string | null;
}

export interface ProfileData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

export interface ProposalCache {
  data: import("@/types/proposals").ProposalListItem[];
  filters: ProposalFilters;
  timestamp: number;
}

export interface ProposalOperationResult {
  success: boolean;
  error?: string;
}

export interface UseProposalOperationsResult {
  approveProposal: (proposalId: string) => Promise<ProposalOperationResult>;
  rejectProposal: (proposalId: string) => Promise<ProposalOperationResult>;
  archiveProposal: (proposalId: string) => Promise<ProposalOperationResult>;
  deleteProposal: (proposalId: string) => Promise<ProposalOperationResult>;
  setReviewLater: (proposalId: string, reviewDate: string) => Promise<ProposalOperationResult>;
}

export interface UseProposalsResult {
  proposals: import("@/types/proposals").ProposalListItem[];
  loading: boolean;
  error: string | null;
  handleFilterChange: (filterType: string, value: string) => void;
  fetchProposals: (forceRefresh?: boolean) => Promise<void>;
}
