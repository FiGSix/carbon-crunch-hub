import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { queryKeys } from '@/lib/queryKeys';
import { CARBON_PRICES } from '@/lib/calculations/carbon/constants';

export interface AdminVintageRevenueData {
  blend: { client: number; agent: number; platform: number } | null;
  years: Record<string, { client: number; agent: number; platform: number }>;
  totals: { client: number; agent: number; platform: number };
}

/**
 * Hook for fetching vintage revenue breakdown for ALL audit-ready projects
 * Admin-only view showing Client/Agent/Platform revenue split
 * 
 * Calculates total revenue per vintage year by:
 * 1. Fetching ALL audit-ready proposals (not filtered by client)
 * 2. For Blend (2022-2024): Includes projects with signed_at <= Dec 31, 2024
 * 3. For future years (2025-2030): Simple calculation using carbon prices
 * 4. Splitting revenue into Client/Agent/Platform shares
 * 
 * @returns React Query result with admin vintage revenue data
 */
export function useAdminVintageRevenueBreakdown() {
  const { user, userRole } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.dashboard.adminVintageRevenue(),
    queryFn: async (): Promise<AdminVintageRevenueData> => {
      if (!user?.id || userRole !== 'admin') {
        // Non-admins see empty data
        return { 
          blend: null, 
          years: {},
          totals: { client: 0, agent: 0, platform: 0 }
        };
      }

      const revenueLogger = logger.withContext({ 
        component: 'useAdminVintageRevenueBreakdown', 
        feature: 'admin-vintage-revenue',
        userId: user.id
      });

      revenueLogger.info('Fetching admin vintage revenue breakdown');

      try {
        // Fetch ALL audit-ready proposals (admin view)
        const { data: proposals, error } = await supabase
          .from('proposals')
          .select(`
            carbon_credits,
            client_share_percentage,
            agent_commission_percentage,
            signed_at,
            project_onboarding!inner(audit_ready)
          `)
          .eq('project_onboarding.audit_ready', true)
          .is('deleted_at', null);

        if (error) {
          revenueLogger.error('Failed to fetch proposals for admin vintage revenue', { 
            error: error.message
          });
          throw error;
        }

        // Blend cutoff: December 31, 2024 23:59:59
        const BLEND_CUTOFF_DATE = new Date('2024-12-31T23:59:59');
        const VINTAGE_YEARS = ['2025', '2026', '2027', '2028', '2029', '2030'];

        // Initialize totals
        let blendClientTotal = 0;
        let blendAgentTotal = 0;
        let blendPlatformTotal = 0;
        
        const futureYearsTotals: Record<string, { client: number; agent: number; platform: number }> = {
          '2025': { client: 0, agent: 0, platform: 0 },
          '2026': { client: 0, agent: 0, platform: 0 },
          '2027': { client: 0, agent: 0, platform: 0 },
          '2028': { client: 0, agent: 0, platform: 0 },
          '2029': { client: 0, agent: 0, platform: 0 },
          '2030': { client: 0, agent: 0, platform: 0 }
        };

        // Calculate revenue for each audit-ready proposal
        proposals?.forEach((proposal) => {
          const carbonCredits = proposal.carbon_credits || 0;
          const clientSharePercentage = proposal.client_share_percentage || 0;
          const agentCommissionPercentage = proposal.agent_commission_percentage || 0;
          const platformSharePercentage = 100 - clientSharePercentage - agentCommissionPercentage;
          const signedAt = proposal.signed_at ? new Date(proposal.signed_at) : null;

          // Calculate Blend only if signed ON or BEFORE Dec 31, 2024
          if (signedAt && signedAt <= BLEND_CUTOFF_DATE) {
            const blendClientRevenue = carbonCredits * CARBON_PRICES['2024'] * (clientSharePercentage / 100);
            const blendAgentRevenue = carbonCredits * CARBON_PRICES['2024'] * (agentCommissionPercentage / 100);
            const blendPlatformRevenue = carbonCredits * CARBON_PRICES['2024'] * (platformSharePercentage / 100);
            
            blendClientTotal += blendClientRevenue;
            blendAgentTotal += blendAgentRevenue;
            blendPlatformTotal += blendPlatformRevenue;
          }

          // Calculate future years (2025-2030)
          VINTAGE_YEARS.forEach(year => {
            const clientRevenue = carbonCredits * CARBON_PRICES[year] * (clientSharePercentage / 100);
            const agentRevenue = carbonCredits * CARBON_PRICES[year] * (agentCommissionPercentage / 100);
            const platformRevenue = carbonCredits * CARBON_PRICES[year] * (platformSharePercentage / 100);
            
            futureYearsTotals[year].client += clientRevenue;
            futureYearsTotals[year].agent += agentRevenue;
            futureYearsTotals[year].platform += platformRevenue;
          });
        });

        // Round all future years
        Object.keys(futureYearsTotals).forEach(year => {
          futureYearsTotals[year].client = Math.round(futureYearsTotals[year].client);
          futureYearsTotals[year].agent = Math.round(futureYearsTotals[year].agent);
          futureYearsTotals[year].platform = Math.round(futureYearsTotals[year].platform);
        });

        // Calculate totals across all years
        const blend = (blendClientTotal > 0 || blendAgentTotal > 0 || blendPlatformTotal > 0) 
          ? { 
              client: Math.round(blendClientTotal), 
              agent: Math.round(blendAgentTotal), 
              platform: Math.round(blendPlatformTotal) 
            }
          : null;

        const totals = {
          client: (blend?.client || 0) + Object.values(futureYearsTotals).reduce((sum, year) => sum + year.client, 0),
          agent: (blend?.agent || 0) + Object.values(futureYearsTotals).reduce((sum, year) => sum + year.agent, 0),
          platform: (blend?.platform || 0) + Object.values(futureYearsTotals).reduce((sum, year) => sum + year.platform, 0)
        };

        const result: AdminVintageRevenueData = {
          blend,
          years: futureYearsTotals,
          totals
        };

        revenueLogger.info('Admin vintage revenue calculated successfully', { 
          blend: blend ? 'present' : 'missed',
          yearsCount: VINTAGE_YEARS.length,
          auditReadyProjects: proposals?.length || 0
        });

        return result;
      } catch (error) {
        revenueLogger.error('Unexpected error calculating admin vintage revenue', { 
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    },
    enabled: !!user?.id && userRole === 'admin',
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
