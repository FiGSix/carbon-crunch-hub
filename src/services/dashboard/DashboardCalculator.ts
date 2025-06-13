
import { ProposalListItem } from '@/types/proposals';

export class DashboardCalculator {
  static calculatePortfolioSize(proposals: ProposalListItem[]): number {
    return proposals.reduce((sum, p) => sum + (p.system_size_kwp || 0), 0);
  }

  static calculateTotalRevenue(proposals: ProposalListItem[]): number {
    return proposals.reduce((sum, p) => sum + (p.carbon_credits || 0) * 50, 0); // Assuming R50 per credit
  }

  static calculateCO2Offset(proposals: ProposalListItem[]): number {
    return proposals.reduce((sum, p) => sum + (p.carbon_credits || 0), 0);
  }

  static calculateDashboardMetrics(proposals: ProposalListItem[]) {
    return {
      portfolioSize: this.calculatePortfolioSize(proposals),
      totalRevenue: this.calculateTotalRevenue(proposals),
      co2Offset: this.calculateCO2Offset(proposals)
    };
  }
}
