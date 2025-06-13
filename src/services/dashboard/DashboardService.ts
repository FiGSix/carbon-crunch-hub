
import { ProposalListItem } from '@/types/proposals';
import { ProposalService } from '../proposal/ProposalService';
import { cacheService } from '../cache/CacheService';

interface DashboardData {
  proposals: ProposalListItem[];
  portfolioSize: number;
  totalRevenue: number;
  co2Offset: number;
}

export class DashboardService {
  static async getDashboardData(
    userId: string, 
    userRole: string
  ): Promise<DashboardData> {
    const cacheKey = `dashboard_${userId}_${userRole}`;
    const cached = cacheService.get<DashboardData>(cacheKey);
    if (cached) return cached;

    try {
      const proposals = await ProposalService.getProposalsWithRelations(userId, userRole);
      
      // Calculate aggregated data
      const portfolioSize = proposals.reduce((sum, p) => sum + (p.system_size_kwp || 0), 0);
      const totalRevenue = proposals.reduce((sum, p) => sum + (p.carbon_credits || 0) * 50, 0); // Assuming R50 per credit
      const co2Offset = proposals.reduce((sum, p) => sum + (p.carbon_credits || 0), 0);

      const result: DashboardData = {
        proposals,
        portfolioSize,
        totalRevenue,
        co2Offset
      };

      cacheService.set(cacheKey, result, 2 * 60 * 1000); // 2 minutes for dashboard data

      return result;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Return proper structure with all required properties, not empty object
      return {
        proposals: [],
        portfolioSize: 0,
        totalRevenue: 0,
        co2Offset: 0
      };
    }
  }
}
