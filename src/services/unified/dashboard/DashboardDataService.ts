
import { ProposalListItem } from '@/types/proposals';
import { ProposalsDataService } from '../proposals/ProposalsDataService';

/**
 * Dashboard data calculations and operations
 */
export class DashboardDataService {
  static async getDashboardData(userId: string, userRole: string): Promise<{
    proposals: ProposalListItem[];
    portfolioSize: number;
    totalRevenue: number;
    co2Offset: number;
  }> {
    const proposals = await ProposalsDataService.getProposals(userId, userRole);
    
    // Simple calculations
    const portfolioSize = proposals.reduce((sum, p) => sum + (p.system_size_kwp || 0), 0);
    const totalRevenue = proposals.reduce((sum, p) => sum + (p.carbon_credits || 0) * 50, 0);
    const co2Offset = proposals.reduce((sum, p) => sum + (p.carbon_credits || 0), 0);

    return {
      proposals,
      portfolioSize,
      totalRevenue,
      co2Offset
    };
  }
}
