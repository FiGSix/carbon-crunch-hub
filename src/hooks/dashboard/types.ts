
import { ProposalListItem } from '@/types/proposals';

export interface DashboardStats {
  totalProposals: number;
  pendingProposals: number;
  approvedProposals: number;
  totalRevenue: number;
  totalEnergyOffset: number;
}

export interface DashboardComputedData {
  stats: DashboardStats;
  recentProposals: ProposalListItem[];
  chartData: ProposalListItem[];
  portfolioSize: number;
  totalProposals: number;
  potentialRevenue: number;
  co2Offset: number;
}

export interface DashboardHelpers {
  getWelcomeMessage: () => string;
  getUserDisplayName: () => string;
  formatUserRole: (role: string | null) => string;
  handleRefreshProposals: () => Promise<void>;
}

export interface DashboardData extends DashboardComputedData, DashboardHelpers {
  // Auth data
  userRole: string | null;
  
  // Proposal data
  proposals: ProposalListItem[];
  
  // Loading states
  loading: boolean;
  error: string | null;
}

export interface ComputedDataCache {
  proposals: ProposalListItem[];
  stats: DashboardStats;
  recentProposals: ProposalListItem[];
  chartData: ProposalListItem[];
}
