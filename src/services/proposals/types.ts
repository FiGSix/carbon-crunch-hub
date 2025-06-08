
/**
 * Common types for proposal services
 */

export interface ProposalCreationResult {
  success: boolean;
  proposalId?: string;
  error?: string;
}

export interface ClientLookupResult {
  id: string;
  email: string;
  isExisting: boolean;
}

export interface PortfolioMetrics {
  totalKWp: number;
  projectCount: number;
  clientSharePercentage: number;
  agentCommissionPercentage: number;
}
