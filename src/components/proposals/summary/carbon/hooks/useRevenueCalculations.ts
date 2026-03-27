
import { useState, useEffect, useMemo } from 'react';
import { UnifiedCarbonService } from '@/services/calculations/carbon';
import { PortfolioData } from '@/services/proposals/portfolioService';
import { dataCache } from '@/lib/cache/UnifiedCache';
import { devLogger } from '@/lib/performance/ConsoleReplacementUtility';
import { ProjectPhase } from '@/types/proposals';

interface UseRevenueCalculationsProps {
  systemSize: string;
  commissionDate?: string;
  portfolioData: PortfolioData | null;
  proposalId?: string | null;
  phases?: ProjectPhase[];
  isMultiPhase?: boolean;
  clientShareOverride?: number | null;
}

export function useRevenueCalculations({
  systemSize,
  commissionDate,
  portfolioData,
  proposalId,
  phases,
  isMultiPhase
}: UseRevenueCalculationsProps) {
  const [clientSpecificRevenue, setClientSpecificRevenue] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const systemSizeKWp = useMemo(() => 
    UnifiedCarbonService.normalizeToKWp(systemSize), 
    [systemSize]
  );

  // Create cache key for this calculation
  const cacheKey = useMemo(() => {
    const portfolioSize = portfolioData?.totalKWp || systemSizeKWp;
    const phaseKey = phases ? phases.map(p => `${p.sizeKWp}-${p.commissionDate}`).join('_') : 'no-phases';
    return `revenue_${systemSizeKWp}_${commissionDate || 'no-date'}_${portfolioSize}_${proposalId || 'no-id'}_${isMultiPhase ? 'multi' : 'single'}_${phaseKey}`;
  }, [systemSizeKWp, commissionDate, portfolioData?.totalKWp, proposalId, phases, isMultiPhase]);

  const [calculationResult, setCalculationResult] = useState<any>(null);

  useEffect(() => {
    const calculateRevenues = async () => {
      try {
        setLoading(true);
        
        // Check cache first
        const cachedResult = dataCache.get<Record<string, number>>(cacheKey);
        if (cachedResult) {
          devLogger.components.log('Using cached revenue calculation');
          setClientSpecificRevenue(cachedResult);
          setLoading(false);
          return;
        }

        const portfolioSize = portfolioData?.totalKWp || systemSizeKWp;
        
        // Build specs based on whether this is multi-phase or single-phase
        const specs = phases && phases.length > 0
          ? { sizeKwp: systemSizeKWp, phases }
          : { sizeKwp: systemSizeKWp, commissionDate };
        
        // Use the unified service to calculate complete financials
        const result = await UnifiedCarbonService.calculateComplete(specs, portfolioSize);

        // Cache the result for 5 minutes
        dataCache.set(cacheKey, result.revenueByYear, 5 * 60 * 1000);
        
        setClientSpecificRevenue(result.revenueByYear);
        setCalculationResult(result);
      } catch (error) {
        devLogger.components.error('Error calculating revenues:', error);
        setClientSpecificRevenue({});
        setCalculationResult(null);
      } finally {
        setLoading(false);
      }
    };

    calculateRevenues();
  }, [cacheKey, systemSizeKWp, commissionDate, portfolioData]);

  return {
    calculationResult,
    clientSpecificRevenue,
    loading,
    systemSizeKWp
  };
}
