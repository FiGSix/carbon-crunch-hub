
import { useState, useEffect, useMemo } from 'react';
import { UnifiedCarbonService } from '@/services/calculations/UnifiedCarbonService';
import { PortfolioData } from '@/services/proposals/portfolioCalculationService';
import { optimizedCache } from '@/services/cache/OptimizedCacheService';
import { usePerformanceMonitor } from '@/hooks/performance/usePerformanceMonitor';

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
  
  // Performance monitoring
  usePerformanceMonitor([systemSize, commissionDate, portfolioData?.totalKWp], {
    componentName: 'useRevenueCalculations'
  });

  const systemSizeKWp = useMemo(() => 
    UnifiedCarbonService.normalizeToKWp(systemSize), 
    [systemSize]
  );

  // Create cache key for this calculation
  const cacheKey = useMemo(() => {
    const portfolioSize = portfolioData?.totalKWp || systemSizeKWp;
    return `revenue_${systemSizeKWp}_${commissionDate || 'no-date'}_${portfolioSize}_${proposalId || 'no-id'}`;
  }, [systemSizeKWp, commissionDate, portfolioData?.totalKWp, proposalId]);

  useEffect(() => {
    const calculateRevenues = async () => {
      try {
        setLoading(true);
        
        // Check cache first
        const cachedResult = optimizedCache.get<Record<string, number>>(cacheKey);
        if (cachedResult) {
          console.log('📦 Using cached revenue calculation');
          setClientSpecificRevenue(cachedResult);
          setLoading(false);
          return;
        }

        const portfolioSize = portfolioData?.totalKWp || systemSizeKWp;
        
        // Use the unified service to calculate complete financials
        const result = await UnifiedCarbonService.calculateComplete({
          sizeKwp: systemSizeKWp,
          commissionDate
        }, portfolioSize);

        // Cache the result for 5 minutes
        optimizedCache.set(cacheKey, result.revenueByYear, 5 * 60 * 1000);
        
        setClientSpecificRevenue(result.revenueByYear);
      } catch (error) {
        console.error('Error calculating revenues:', error);
        setClientSpecificRevenue({});
      } finally {
        setLoading(false);
      }
    };

    calculateRevenues();
  }, [cacheKey, systemSizeKWp, commissionDate, portfolioData]);

  return {
    clientSpecificRevenue,
    loading,
    systemSizeKWp
  };
}
