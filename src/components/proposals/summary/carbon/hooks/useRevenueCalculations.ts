
import { useState, useEffect } from 'react';
import { normalizeToKWp } from '@/lib/calculations/carbon';
import { calculateClientSpecificRevenue } from '@/lib/calculations/carbon/clientPricing';
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
  
  const systemSizeKWp = normalizeToKWp(systemSize);

  useEffect(() => {
    const calculateRevenues = async () => {
      try {
        setLoading(true);
        
        const carbonPrices = await dynamicCarbonPricingService.getCarbonPrices();
        const portfolioSize = portfolioData?.totalKWp || systemSizeKWp;
        const revenues: Record<string, number> = {};

        for (const [year] of Object.entries(carbonPrices)) {
          const carbonCredits = calculateYearlyCarbonCredits(systemSizeKWp, parseInt(year), commissionDate);
          const revenue = await calculateClientSpecificRevenue(year, carbonCredits, portfolioSize);
          revenues[year] = revenue;
        }

        setClientSpecificRevenue(revenues);
      } catch (error) {
        console.error('Error calculating revenues:', error);
        setClientSpecificRevenue({});
      } finally {
        setLoading(false);
      }
    };

    calculateRevenues();
  }, [systemSize, commissionDate, portfolioData, proposalId]);

  return {
    clientSpecificRevenue,
    loading,
    systemSizeKWp
  };
}
