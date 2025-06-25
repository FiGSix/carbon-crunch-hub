
import { useState, useEffect } from 'react';
import { UnifiedCarbonService } from '@/services/calculations/UnifiedCarbonService';
import { calculateYearlyCarbonCredits } from '../carbonCalculations';
import { dynamicCarbonPricingService } from '@/lib/calculations/carbon/dynamicPricing';
import { PortfolioData } from '@/services/proposals/portfolioCalculationService';

interface UseRevenueCalculationsProps {
  systemSize: string;
  commissionDate?: string;
  portfolioData: PortfolioData | null;
  proposalId?: string | null;
}

export function useRevenueCalculations({
  systemSize,
  commissionDate,
  portfolioData,
  proposalId
}: UseRevenueCalculationsProps) {
  const [clientSpecificRevenue, setClientSpecificRevenue] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  
  const systemSizeKWp = UnifiedCarbonService.normalizeToKWp(systemSize);

  useEffect(() => {
    const calculateRevenues = async () => {
      try {
        setLoading(true);
        
        const portfolioSize = portfolioData?.totalKWp || systemSizeKWp;
        
        // Use the unified service to calculate complete financials
        const result = await UnifiedCarbonService.calculateComplete({
          sizeKwp: systemSizeKWp,
          commissionDate
        }, portfolioSize);

        setClientSpecificRevenue(result.revenueByYear);
      } catch (error) {
        console.error('Error calculating revenues:', error);
        setClientSpecificRevenue({});
      } finally {
        setLoading(false);
      }
    };

    calculateRevenues();
  }, [systemSize, commissionDate, portfolioData, proposalId, systemSizeKWp]);

  return {
    clientSpecificRevenue,
    loading,
    systemSizeKWp
  };
}
