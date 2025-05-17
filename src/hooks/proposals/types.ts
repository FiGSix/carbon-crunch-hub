
import { ProposalListItem, ProposalData, ProposalOperationResult } from "@/types/proposals";

/**
 * Raw proposal data from Supabase before transformation
 */
export interface RawProposalData {
  id: string;
  title: string;
  content: any;
  status: string;
  created_at: string;
  client_id: string;
  agent_id: string | null;
  annual_energy: number | null;
  carbon_credits: number | null;
  client_share_percentage: number | null;
  invitation_sent_at: string | null;
  invitation_viewed_at: string | null;
  invitation_expires_at: string | null;
  review_later_until: string | null;
  is_preview: boolean | null;
  preview_of_id: string | null;
}

/**
 * Props for the useAuthRefresh hook
 */
export interface UseAuthRefreshProps {
  refreshUser: () => Promise<void>;
  user: any | null;
}

/**
 * Result of the useProposals hook
 */
export interface UseProposalsResult {
  proposals: ProposalListItem[];
  loading: boolean;
  error: string | null;
  filters: {
    search: string;
    status: string;
    sort: string;
  };
  handleFilterChange: (key: string, value: string) => void;
  fetchProposals: () => Promise<void>;
}

/**
 * Basic proposal information
 */
export interface BasicProposalInfo {
  id: string;
  title: string;
  status: string;
}

/**
 * Result object returned by proposal operations
 */
export type {
  ProposalOperationResult
};
