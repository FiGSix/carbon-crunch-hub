
import { supabase } from '@/integrations/supabase/client';
import { ProposalListItem, ProposalContent } from '@/types/proposals';
import { CacheManager } from '../cache/CacheManager';

/**
 * Proposals data operations with improved RLS support
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

      // Apply role-based filtering - RLS will handle the access control
      // but we can optimize queries by adding filters
      if (userRole === 'agent') {
        query = query.eq('agent_id', userId);
      } else if (userRole === 'client') {
        // For clients, we need to check both client_id and client_reference_id
        query = query.or(`client_id.eq.${userId},client_reference_id.in.(select id from clients where user_id=eq.${userId})`);
      }
      // Admin sees all proposals - no additional filter needed

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Transform the data to match ProposalListItem type
      const proposals: ProposalListItem[] = (data || []).map(proposal => {
        // Get client name from various sources
        let clientName = 'Unknown Client';
        
        if (proposal.client && proposal.client.first_name) {
          clientName = `${proposal.client.first_name} ${proposal.client.last_name || ''}`.trim();
        } else if (proposal.client_contact && proposal.client_contact.first_name) {
          clientName = `${proposal.client_contact.first_name} ${proposal.client_contact.last_name || ''}`.trim();
        }

        return {
          id: proposal.id,
          name: proposal.title || 'Untitled Proposal',
          title: proposal.title || 'Untitled Proposal',
          date: proposal.created_at,
          created_at: proposal.created_at,
          status: proposal.status,
          size: proposal.system_size_kwp || 0,
          system_size_kwp: proposal.system_size_kwp || 0,
          revenue: (proposal.carbon_credits || 0) * 50, // Simple calculation
          client: clientName,
          client_id: proposal.client_id,
          client_reference_id: proposal.client_reference_id,
          agent_id: proposal.agent_id,
          signed_at: proposal.signed_at,
          archived_at: proposal.archived_at,
          review_later_until: proposal.review_later_until,
          annual_energy: proposal.annual_energy,
          carbon_credits: proposal.carbon_credits,
          client_share_percentage: proposal.client_share_percentage,
          agent_commission_percentage: proposal.agent_commission_percentage,
          agent_portfolio_kwp: proposal.agent_portfolio_kwp,
          invitation_sent_at: proposal.invitation_sent_at,
          invitation_viewed_at: proposal.invitation_viewed_at,
          invitation_expires_at: proposal.invitation_expires_at,
          content: proposal.content as unknown as ProposalContent
        };
      });

      CacheManager.setCache(cacheKey, proposals);
      return proposals;
    } catch (error) {
      console.error('Error fetching proposals:', error);
      
      // If it's an RLS permission error, return empty array instead of throwing
      if (error?.code === 'PGRST116' || error?.code === '42501') {
        console.log('RLS permission issue - returning empty array');
        return [];
      }
      
      throw error;
    }
  }
}
