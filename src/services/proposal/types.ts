
import { ProposalListItem } from '@/types/proposals';

export interface ProposalOperations {
  getProposalsWithRelations(userId: string, userRole: string, forceRefresh?: boolean): Promise<ProposalListItem[]>;
  batchUpdateProposals(updates: ProposalUpdateBatch[]): Promise<BatchUpdateResult>;
}

export interface ProposalUpdateBatch {
  id: string;
  data: Partial<{
    status: string;
    title: string;
    carbon_credits: number;
    client_share_percentage: number;
    agent_commission_percentage: number;
    content: any;
  }>;
}

export interface BatchUpdateResult {
  success: boolean;
  errors: string[];
}

export interface ProposalServiceDependencies {
  cache: {
    get<T>(key: string): T | null;
    set<T>(key: string, data: T, ttl?: number): void;
    invalidate(pattern: string): void;
  };
}
