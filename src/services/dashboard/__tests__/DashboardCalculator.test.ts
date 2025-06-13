
import { DashboardCalculator } from '../DashboardCalculator';
import { ProposalListItem } from '@/types/proposals';

describe('DashboardCalculator', () => {
  const mockProposals: ProposalListItem[] = [
    {
      id: '1',
      system_size_kwp: 100,
      carbon_credits: 50,
      client_share_percentage: 80
    } as ProposalListItem,
    {
      id: '2',
      system_size_kwp: 200,
      carbon_credits: 75,
      client_share_percentage: 70
    } as ProposalListItem,
    {
      id: '3',
      system_size_kwp: null,
      carbon_credits: null,
      client_share_percentage: null
    } as ProposalListItem
  ];

  describe('calculatePortfolioSize', () => {
    it('should sum up system sizes correctly', () => {
      const result = DashboardCalculator.calculatePortfolioSize(mockProposals);
      expect(result).toBe(300); // 100 + 200 + 0
    });

    it('should handle empty array', () => {
      const result = DashboardCalculator.calculatePortfolioSize([]);
      expect(result).toBe(0);
    });

    it('should handle null values', () => {
      const proposalsWithNulls = [
        { system_size_kwp: null } as ProposalListItem,
        { system_size_kwp: 100 } as ProposalListItem
      ];
      
      const result = DashboardCalculator.calculatePortfolioSize(proposalsWithNulls);
      expect(result).toBe(100);
    });
  });

  describe('calculateTotalRevenue', () => {
    it('should calculate total revenue correctly', () => {
      const result = DashboardCalculator.calculateTotalRevenue(mockProposals);
      // (50 * 50) + (75 * 50) + (0 * 50) = 2500 + 3750 + 0 = 6250
      expect(result).toBe(6250);
    });

    it('should handle empty array', () => {
      const result = DashboardCalculator.calculateTotalRevenue([]);
      expect(result).toBe(0);
    });

    it('should handle null carbon credits', () => {
      const proposalsWithNulls = [
        { carbon_credits: null } as ProposalListItem,
        { carbon_credits: 100 } as ProposalListItem
      ];
      
      const result = DashboardCalculator.calculateTotalRevenue(proposalsWithNulls);
      expect(result).toBe(5000); // 100 * 50
    });
  });

  describe('calculateCO2Offset', () => {
    it('should sum up carbon credits correctly', () => {
      const result = DashboardCalculator.calculateCO2Offset(mockProposals);
      expect(result).toBe(125); // 50 + 75 + 0
    });

    it('should handle empty array', () => {
      const result = DashboardCalculator.calculateCO2Offset([]);
      expect(result).toBe(0);
    });

    it('should handle null values', () => {
      const proposalsWithNulls = [
        { carbon_credits: null } as ProposalListItem,
        { carbon_credits: 50 } as ProposalListItem
      ];
      
      const result = DashboardCalculator.calculateCO2Offset(proposalsWithNulls);
      expect(result).toBe(50);
    });
  });

  describe('calculateDashboardMetrics', () => {
    it('should calculate all metrics together', () => {
      const result = DashboardCalculator.calculateDashboardMetrics(mockProposals);
      
      expect(result).toEqual({
        portfolioSize: 300,
        totalRevenue: 6250,
        co2Offset: 125
      });
    });

    it('should handle empty proposals array', () => {
      const result = DashboardCalculator.calculateDashboardMetrics([]);
      
      expect(result).toEqual({
        portfolioSize: 0,
        totalRevenue: 0,
        co2Offset: 0
      });
    });
  });
});
