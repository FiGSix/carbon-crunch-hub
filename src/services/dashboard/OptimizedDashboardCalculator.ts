
import { ProposalListItem } from '@/types/proposals';

export class OptimizedDashboardCalculator {
  static calculateDashboardMetrics(proposals: ProposalListItem[]) {
    // Single loop to calculate all metrics at once
    const metrics = proposals.reduce((acc, proposal) => {
      const systemSize = proposal.system_size_kwp || 0;
      const carbonCredits = proposal.carbon_credits || 0;
      
      acc.portfolioSize += systemSize;
      acc.totalRevenue += carbonCredits * 50; // Assuming R50 per credit
      acc.co2Offset += carbonCredits;
      
      return acc;
    }, {
      portfolioSize: 0,
      totalRevenue: 0,
      co2Offset: 0
    });

    return metrics;
  }

  static calculatePortfolioSize(proposals: ProposalListItem[]): number {
    return proposals.reduce((sum, p) => sum + (p.system_size_kwp || 0), 0);
  }

  static calculateTotalRevenue(proposals: ProposalListItem[]): number {
    return proposals.reduce((sum, p) => sum + (p.carbon_credits || 0) * 50, 0);
  }

  static calculateCO2Offset(proposals: ProposalListItem[]): number {
    return proposals.reduce((sum, p) => sum + (p.carbon_credits || 0), 0);
  }
}
