import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePendingAgentApprovals(enabled: boolean = true) {
  return useQuery({
    queryKey: ['dashboard', 'pendingAgentApprovals'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'agent')
        .eq('agent_status', 'pending_approval');

      if (error) throw error;
      return count || 0;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000,
  });
}
