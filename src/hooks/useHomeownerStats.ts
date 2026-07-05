import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HomeownerStats {
  homeownerCount: number | null;
  co2OffsetTons: number | null;
  totalSystemKwp: number | null;
  signedProposalCount: number | null;
}

/**
 * Public marketing stats pulled from the DB via SECURITY DEFINER RPC.
 * Single source of truth for homeowner counts / platform totals on the
 * homepage and /home-owners page.
 */
export function useHomeownerStats() {
  const query = useQuery<HomeownerStats>({
    queryKey: ['homeowner-stats'],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_homeowner_stats');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        homeownerCount: row?.homeowner_count ?? null,
        co2OffsetTons: row?.co2_offset_tons != null ? Number(row.co2_offset_tons) : null,
        totalSystemKwp: row?.total_system_kwp != null ? Number(row.total_system_kwp) : null,
        signedProposalCount: row?.signed_proposal_count ?? null,
      };
    },
  });

  return {
    stats: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}
