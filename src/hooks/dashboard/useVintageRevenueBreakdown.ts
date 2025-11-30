import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { queryKeys } from '@/lib/queryKeys';
import { CARBON_PRICES } from '@/lib/calculations/carbon/constants';

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
 * 3. For future years (2025-2030): Simple calculation using carbon prices
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
        // First, get the client reference ID if it exists
        const { data: clientRecord } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .single();

        const clientReferenceId = clientRecord?.id;

        // Fetch all audit-ready proposals
        const { data: allProposals, error } = await supabase
          .from('proposals')
          .select(`
            client_id,
            client_reference_id,
            carbon_credits,
            client_share_percentage,
            signed_at,
            project_onboarding!inner(audit_ready)
          `)
          .eq('project_onboarding.audit_ready', true)
          .is('deleted_at', null);

        if (error) {
          revenueLogger.error('Failed to fetch proposals for vintage revenue', { 
            error: error.message
          });
          throw error;
        }

        // Filter to only this client's proposals
        const proposals = allProposals?.filter(p => 
          p.client_id === user.id || p.client_reference_id === clientReferenceId
        );

        // Blend cutoff: December 31, 2024 23:59:59
        const BLEND_CUTOFF_DATE = new Date('2024-12-31T23:59:59');
        const VINTAGE_YEARS = ['2025', '2026', '2027', '2028', '2029', '2030'];

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

          // Calculate Blend only if signed ON or BEFORE Dec 31, 2024
          if (signedAt && signedAt <= BLEND_CUTOFF_DATE) {
            const blendRevenue = carbonCredits * CARBON_PRICES['2024'] * (clientSharePercentage / 100);
            blendTotal += blendRevenue;
          }

          // Calculate future years (2025-2030) using simple formula
          VINTAGE_YEARS.forEach(year => {
            const yearRevenue = carbonCredits * CARBON_PRICES[year] * (clientSharePercentage / 100);
            futureYearsTotals[year] += Math.round(yearRevenue);
          });
        });

        // If no projects qualified for Blend, set to null ("Missed Vintage")
        const blend = blendTotal > 0 ? Math.round(blendTotal) : null;

        const result: VintageRevenueData = {
          blend,
          years: futureYearsTotals
        };

        revenueLogger.info('Vintage revenue calculated successfully', { 
          blend: blend ? 'present' : 'missed',
          yearsCount: VINTAGE_YEARS.length,
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
