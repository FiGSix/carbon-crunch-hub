
import { supabase } from '@/integrations/supabase/client';
import { ProposalListItem } from '@/types/proposals';
import { CacheManager } from '../cache/CacheManager';

/**
 * Proposals data operations
 */
export class ProposalsDataService {
  static async getProposals(userId: string, userRole: string, forceRefresh = false): Promise<ProposalListItem[]> {
    const cacheKey = CacheManager.getCacheKey('proposals', userId, userRole);
    
    if (!forceRefresh) {
      const cached = CacheManager.getFromCache<ProposalListItem[]>(cacheKey);
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
        `)
        .is('deleted_at', null);

      // Apply role-based filtering
      if (userRole === 'agent') {
        query = query.eq('agent_id', userId);
      } else if (userRole === 'client') {
        query = query.eq('client_id', userId);
      }
      // Admin sees all proposals

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match ProposalListItem type and fix the client field
      const proposals: ProposalListItem[] = (data || []).map(proposal => {
        // Get client name from various sources
        let clientName = 'Unknown Client';
        
        if (proposal.agent && proposal.agent.first_name) {
          clientName = `${proposal.agent.first_name} ${proposal.agent.last_name || ''}`.trim();
        } else if (proposal.client && proposal.client.first_name) {
          clientName = `${proposal.client.first_name} ${proposal.client.last_name || ''}`.trim();
        } else if (proposal.client_contact && proposal.client_contact.first_name) {
          clientName = `${proposal.client_contact.first_name} ${proposal.client_contact.last_name || ''}`.trim();
        }

        return {
          id: proposal.id,
          name: proposal.title || 'Untitled Proposal',
          date: proposal.created_at,
          status: proposal.status,
          size: proposal.system_size_kwp || 0,
          revenue: (proposal.carbon_credits || 0) * 50, // Simple calculation
          client: clientName, // This should be a string, not an object
          // Include all original fields
          ...proposal
        };
      });

      CacheManager.setCache(cacheKey, proposals);
      return proposals;
    } catch (error) {
      console.error('Error fetching proposals:', error);
      return [];
    }
  }
}
