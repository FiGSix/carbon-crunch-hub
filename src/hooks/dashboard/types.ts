
import { ProposalListItem } from '@/types/proposals';
import { AgentCommissionStats } from './useAgentCommissionStats';

export interface DashboardStats {
  totalProposals: number;
  pendingProposals: number;
  approvedProposals: number;
  totalRevenue: number;
  totalEnergyOffset: number;
  agentCommissionStats?: AgentCommissionStats;
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

// ============= Phase 2: New Dashboard Metrics by Stage =============

/**
 * Dashboard metrics organized by project pipeline stage
 * Used for the new 4-card dashboard layout
 */
export interface DashboardMetricsByStage {
  /** Card 1: Audit Ready Projects - Total MWp (3 decimals) */
  auditReadyMwp: number;
  
  /** Card 2: Total Revenue (Audit Ready, 2025-2030) in Rands */
  auditReadyRevenue: number;
  
  /** Card 3: Audit Review Requests - Number of projects awaiting admin review */
  auditReviewRequests: number;
  
  /** Card 4: Onboarding Projects - Total MWp (3 decimals) */
  onboardingMwp: number;
  
  /** Card 5: Pending Approval - Total MWp (3 decimals) */
  pendingApprovalMwp: number;
  
  /** Card 6: Pending Approval Revenue (2025-2030) in Rands */
  pendingApprovalRevenue: number;
}

/**
 * Unified dashboard data structure (V2)
 * Combines metrics by stage with recent proposals
 */
export interface UnifiedDashboardDataV2 {
  /** The 4 key metrics for the dashboard cards */
  metrics: DashboardMetricsByStage;
  
  /** Recent proposals for the "Recent Projects" section */
  proposals: ProposalListItem[];
  
  /** Loading state for the entire dashboard */
  loading: boolean;
  
  /** Error message if any operation failed */
  error: string | null;
}
