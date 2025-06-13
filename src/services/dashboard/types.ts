
import { ProposalListItem } from '@/types/proposals';

export interface DashboardData {
  proposals: ProposalListItem[];
  portfolioSize: number;
  totalRevenue: number;
  co2Offset: number;
}

export interface DashboardOperations {
  getDashboardData(userId: string, userRole: string): Promise<DashboardData>;
}

export interface DashboardServiceDependencies {
  proposalService: {
    getProposalsWithRelations(userId: string, userRole: string, forceRefresh?: boolean): Promise<ProposalListItem[]>;
  };
  cache: {
    get<T>(key: string): T | null;
    set<T>(key: string, data: T, ttl?: number): void;
  };
}
