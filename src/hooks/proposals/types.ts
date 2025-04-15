
import { Proposal } from "@/components/proposals/ProposalList";

export interface ProposalFilters {
  search: string;
  status: string;
  sort: string;
}

export interface UseProposalsResult {
  proposals: Proposal[];
  loading: boolean;
  filters: ProposalFilters;
  handleFilterChange: (filter: string, value: string) => void;
  fetchProposals: () => Promise<void>;
}

export interface RawProposalData {
  id: string;
  title: string;
  created_at: string;
  status: string;
  content: any;
  client_id: string;
  agent_id: string;
  annual_energy: number;
  carbon_credits: number;
  client_share_percentage: number;
  invitation_sent_at: string | null;
  invitation_viewed_at: string | null;
  invitation_expires_at: string | null;
  review_later_until: string | null;
}

export interface ProfileData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}
