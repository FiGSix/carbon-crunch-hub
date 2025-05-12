
import { ProposalFilters, ProposalListItem } from "@/types/proposals";

export interface UseProposalsResult {
  proposals: ProposalListItem[];
  loading: boolean;
  error?: string | null;
  filters: ProposalFilters;
  handleFilterChange: (filter: string, value: string) => void;
  fetchProposals: () => Promise<void>;
}

export interface ProfileData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

// This type represents the raw data structure from the database
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
