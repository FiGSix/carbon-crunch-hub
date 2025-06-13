
import { DashboardOperations, DashboardData, DashboardServiceDependencies } from './types';
import { DashboardCalculator } from './DashboardCalculator';
import { CACHE_KEYS, CACHE_TTL } from '../cache/types';

export class DashboardService implements DashboardOperations {
  constructor(private dependencies: DashboardServiceDependencies) {}

  async getDashboardData(userId: string, userRole: string): Promise<DashboardData> {
    const cacheKey = CACHE_KEYS.DASHBOARD(userId, userRole);
    const cached = this.dependencies.cache.get<DashboardData>(cacheKey);
    if (cached) return cached;

    try {
      const proposals = await this.dependencies.proposalService.getProposalsWithRelations(userId, userRole);
      
      // Calculate aggregated data using the calculator
      const metrics = DashboardCalculator.calculateDashboardMetrics(proposals);

      const result: DashboardData = {
        proposals,
        ...metrics
      };

      this.dependencies.cache.set(cacheKey, result, CACHE_TTL.SHORT);

      return result;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Return proper structure with all required properties
      return {
        proposals: [],
        portfolioSize: 0,
        totalRevenue: 0,
        co2Offset: 0
      };
    }
  }
}
