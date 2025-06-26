
import { ProposalListItem } from '@/types/proposals';
import { OptimizedDashboardCalculator } from './OptimizedDashboardCalculator';

export class DashboardCalculator {
  static calculatePortfolioSize(proposals: ProposalListItem[]): number {
    return OptimizedDashboardCalculator.calculatePortfolioSize(proposals);
  }

  static calculateTotalRevenue(proposals: ProposalListItem[]): number {
    return OptimizedDashboardCalculator.calculateTotalRevenue(proposals);
  }

  static calculateCO2Offset(proposals: ProposalListItem[]): number {
    return OptimizedDashboardCalculator.calculateCO2Offset(proposals);
  }

  static calculateDashboardMetrics(proposals: ProposalListItem[]) {
    // Use the optimized single-loop calculation
    return OptimizedDashboardCalculator.calculateDashboardMetrics(proposals);
  }
}
