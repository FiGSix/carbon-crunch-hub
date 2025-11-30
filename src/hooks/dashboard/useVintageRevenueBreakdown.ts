import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { queryKeys } from '@/lib/queryKeys';
import { CARBON_PRICES } from '@/lib/calculations/carbon/constants';
import { calculateRevenueByYearSync } from '@/services/calculations/carbon/pricing';

export interface VintageRevenueData {
  blend: number | null; // null = "Missed Vintage"
  years: Record<string, number>; // "2025" -> revenue, "2026" -> revenue, etc.
}

/**
 * Hook for fetching vintage revenue breakdown for the client's portfolio
 * 
 * Calculates total revenue per vintage year by:
 * 1. Fetching only audit-ready proposals (project_onboarding.audit_ready = true)
 * 2. For Blend (2022-2024): Includes projects with signed_at <= Dec 31, 2024
 * 3. For future years (2025-2030): Uses calculateRevenueByYearSync with commission_date
 * 4. Aggregating revenue across all qualifying projects
 * 
 * @returns React Query result with vintage revenue data
 */
export function useVintageRevenueBreakdown() {
  const { user, userRole } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.dashboard.vintageRevenue(user?.id || ''),
    queryFn: async (): Promise<VintageRevenueData> => {
      if (!user?.id || userRole !== 'client') {
        // Non-clients see empty data
        return { blend: null, years: {} };
      }

      const revenueLogger = logger.withContext({ 
        component: 'useVintageRevenueBreakdown', 
        feature: 'vintage-revenue',
        userId: user.id
      });

      revenueLogger.info('Fetching vintage revenue breakdown');

      try {
        // Fetch only audit-ready proposals with signed_at and commission date
        const { data: proposals, error } = await supabase
          .from('proposals')
          .select(`
            carbon_credits,
            client_share_percentage,
            signed_at,
            content,
            project_onboarding!inner(audit_ready)
          `)
          .or(`client_id.eq.${user.id},client_reference_id.in.(select id from clients where user_id='${user.id}')`)
          .eq('project_onboarding.audit_ready', true)
          .is('deleted_at', null);

        if (error) {
          revenueLogger.error('Failed to fetch proposals for vintage revenue', { 
            error: error.message
          });
          throw error;
        }

        // Blend cutoff: December 31, 2024 23:59:59
        const BLEND_CUTOFF_DATE = new Date('2024-12-31T23:59:59');
        
        // Future years carbon prices (2025-2030)
        const { '2024': blendPrice, ...futureYearsPrices } = CARBON_PRICES;

        // Initialize totals
        let blendTotal = 0;
        const futureYearsTotals: Record<string, number> = {
          '2025': 0,
          '2026': 0,
          '2027': 0,
          '2028': 0,
          '2029': 0,
          '2030': 0
        };

        // Calculate revenue for each audit-ready proposal
        proposals?.forEach((proposal) => {
          const carbonCredits = proposal.carbon_credits || 0;
          const clientSharePercentage = proposal.client_share_percentage || 0;
          const signedAt = proposal.signed_at ? new Date(proposal.signed_at) : null;
          const commissionDate = (proposal.content as any)?.projectInfo?.commissionDate;

          // Calculate future years (2025-2030) using commission date
          const futureRevenueByYear = calculateRevenueByYearSync(
            carbonCredits,
            clientSharePercentage,
            futureYearsPrices,
            commissionDate
          );

          // Aggregate future years
          Object.entries(futureRevenueByYear).forEach(([year, revenue]) => {
            if (futureYearsTotals[year] !== undefined) {
              futureYearsTotals[year] += revenue;
            }
          });

          // Calculate Blend only if signed ON or BEFORE Dec 31, 2024
          if (signedAt && signedAt <= BLEND_CUTOFF_DATE) {
            const blendRevenue = carbonCredits * blendPrice * (clientSharePercentage / 100);
            blendTotal += blendRevenue;
          }
        });

        // If no projects qualified for Blend, set to null ("Missed Vintage")
        const blend = blendTotal > 0 ? blendTotal : null;

        const result: VintageRevenueData = {
          blend,
          years: futureYearsTotals
        };

        revenueLogger.info('Vintage revenue calculated successfully', { 
          blend: blend ? 'present' : 'missed',
          yearsCount: Object.keys(futureYearsTotals).length,
          auditReadyProjects: proposals?.length || 0
        });

        return result;
      } catch (error) {
        revenueLogger.error('Unexpected error calculating vintage revenue', { 
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    },
    enabled: !!user?.id && userRole === 'client',
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
