
import { supabase } from '@/integrations/supabase/client';
import { ProposalListItem } from '@/types/proposals';
import { ProposalOperations, ProposalServiceDependencies, ProposalUpdateBatch, BatchUpdateResult } from './types';
import { ProposalTransformer } from './ProposalTransformer';
import { CACHE_KEYS, CACHE_TTL } from '../cache/types';

export class ProposalService implements ProposalOperations {
  constructor(private dependencies: ProposalServiceDependencies) {}

  async getProposalsWithRelations(
    userId: string, 
    userRole: string, 
    forceRefresh = false
  ): Promise<ProposalListItem[]> {
    const cacheKey = CACHE_KEYS.PROPOSALS(userId, userRole);
    
    if (!forceRefresh) {
      const cached = this.dependencies.cache.get<ProposalListItem[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      let query = supabase
        .from('proposals')
        .select(`
          *,
          agent:profiles!proposals_agent_id_fkey(first_name, last_name, email),
          client:profiles!proposals_client_id_fkey(first_name, last_name, email),
          client_contact:clients!proposals_client_reference_id_fkey(first_name, last_name, email)
        `);

      // Apply role-based filtering
      if (userRole === 'client') {
        query = query.eq('client_id', userId);
      } else if (userRole === 'agent') {
        query = query.eq('agent_id', userId);
      }
      // Admin sees all proposals (no additional filter needed)

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Transform raw data to ProposalListItem[]
      const proposals = ProposalTransformer.transformBatch(data || []);
      this.dependencies.cache.set(cacheKey, proposals, CACHE_TTL.SHORT);

      return proposals;
    } catch (error) {
      console.error('Error fetching proposals:', error);
      return [];
    }
  }

  async batchUpdateProposals(updates: ProposalUpdateBatch[]): Promise<BatchUpdateResult> {
    const errors: string[] = [];

    try {
      const promises = updates.map(async ({ id, data }) => {
        try {
          const { error } = await supabase
            .from('proposals')
            .update(data)
            .eq('id', id);

          if (error) throw error;
        } catch (error: any) {
          errors.push(`Failed to update proposal ${id}: ${error.message}`);
        }
      });

      await Promise.all(promises);

      // Invalidate relevant caches
      this.dependencies.cache.invalidate('proposals_');

      return { success: errors.length === 0, errors };
    } catch (error: any) {
      return { success: false, errors: [error.message] };
    }
  }
}
