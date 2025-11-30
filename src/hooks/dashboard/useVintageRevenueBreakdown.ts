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
 * Calculates total revenue per vintage year (2024-2030) by:
 * 1. Fetching all signed/approved proposals for the client
 * 2. For each proposal: revenue = carbon_credits × carbon_price × (client_share / 100)
 * 3. Aggregating revenue by year
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
        // Fetch all signed/approved proposals for the client
        const { data: proposals, error } = await supabase
          .from('proposals')
          .select(`
            carbon_credits,
            client_share_percentage,
            status
          `)
          .or(`client_id.eq.${user.id},client_reference_id.in.(select id from clients where user_id='${user.id}')`)
          .in('status', ['signed', 'approved'])
          .is('deleted_at', null);

        if (error) {
          revenueLogger.error('Failed to fetch proposals for vintage revenue', { 
            error: error.message
          });
          throw error;
        }

        // Initialize revenue totals for each year
        const revenueByYear: Record<string, number> = {
          '2024': 0, // Blend
          '2025': 0,
          '2026': 0,
          '2027': 0,
          '2028': 0,
          '2029': 0,
          '2030': 0
        };

        // Calculate revenue for each proposal
        proposals?.forEach((proposal) => {
          const carbonCredits = proposal.carbon_credits || 0;
          const clientSharePercentage = proposal.client_share_percentage || 0;

          // Calculate revenue for each year
          Object.entries(CARBON_PRICES).forEach(([year, price]) => {
            const revenue = carbonCredits * price * (clientSharePercentage / 100);
            revenueByYear[year] += revenue;
          });
        });

        // Extract blend (2024) separately
        const blend = revenueByYear['2024'] > 0 ? revenueByYear['2024'] : null;
        
        // Remove 2024 from years object
        const { '2024': _, ...years } = revenueByYear;

        const result: VintageRevenueData = {
          blend,
          years
        };

        revenueLogger.info('Vintage revenue calculated successfully', { 
          blend: blend ? 'present' : 'missed',
          yearsCount: Object.keys(years).length
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
