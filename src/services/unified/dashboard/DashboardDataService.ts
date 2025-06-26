
import { ProposalListItem } from '@/types/proposals';
import { ProposalsDataService } from '../proposals/ProposalsDataService';
import { UserRole } from '@/contexts/auth/types';
import { UnifiedDashboardCalculations } from '@/services/dashboard/UnifiedDashboardCalculations';

/**
 * Dashboard data calculations and operations - now optimized with single-pass calculations
 */
export class DashboardDataService {
  static async getDashboardData(userId: string, userRole: UserRole): Promise<{
    proposals: ProposalListItem[];
    portfolioSize: number;
    totalRevenue: number;
    co2Offset: number;
  }> {
    const proposals = await ProposalsDataService.getProposals(userId, userRole);
    
    // Use unified calculations for single-pass processing
    const metrics = UnifiedDashboardCalculations.calculateAllMetrics(proposals, userRole);

    return {
      proposals,
      portfolioSize: metrics.portfolioSize,
      totalRevenue: metrics.totalRevenue,
      co2Offset: metrics.co2Offset
    };
  }
}
