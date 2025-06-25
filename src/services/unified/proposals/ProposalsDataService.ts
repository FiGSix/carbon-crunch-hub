
import { supabase } from '@/integrations/supabase/client';
import { ProposalListItem } from '@/types/proposals';
import { CacheManager } from '../cache/CacheManager';
import { RoleValidator } from '../utils/RoleValidator';
import { ErrorHandler } from '../utils/ErrorHandler';

/**
 * Proposals data operations with enhanced security validation
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
          id,
          title,
          status,
          created_at,
          signed_at,
          archived_at,
          deleted_at,
          review_later_until,
          client_id,
          client_reference_id,
          agent_id,
          content,
          annual_energy,
          carbon_credits,
          client_share_percentage,
          agent_commission_percentage,
          system_size_kwp,
          unit_standard,
          invitation_sent_at,
          invitation_viewed_at,
          invitation_expires_at
        `)
        .is('deleted_at', null); // Exclude soft-deleted proposals

      // Apply role-based filtering - RLS will handle the actual security
      if (userRole === 'client') {
        query = query.or(`client_id.eq.${userId},client_reference_id.eq.${userId}`);
      } else if (userRole === 'agent') {
        query = query.eq('agent_id', userId);
      }
      // Admin role gets all non-deleted proposals (no additional filter needed)

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        const errorResult = ErrorHandler.handleRLSError(error, 'proposals fetch');
        if (errorResult.requiresReauth) {
          window.dispatchEvent(new CustomEvent('auth-required'));
        }
        return [];
      }

      if (!data) return [];

      // Transform to ProposalListItem format
      const proposals: ProposalListItem[] = data.map(proposal => ({
        id: proposal.id,
        title: proposal.title,
        status: proposal.status as 'draft' | 'pending' | 'approved' | 'rejected',
        created_at: proposal.created_at,
        signed_at: proposal.signed_at,
        archived_at: proposal.archived_at,
        review_later_until: proposal.review_later_until,
        client_id: proposal.client_id,
        client_reference_id: proposal.client_reference_id,
        agent_id: proposal.agent_id,
        content: proposal.content,
        annual_energy: proposal.annual_energy,
        carbon_credits: proposal.carbon_credits,
        client_share_percentage: proposal.client_share_percentage,
        agent_commission_percentage: proposal.agent_commission_percentage,
        system_size_kwp: proposal.system_size_kwp,
        unit_standard: proposal.unit_standard,
        invitation_sent_at: proposal.invitation_sent_at,
        invitation_viewed_at: proposal.invitation_viewed_at,
        invitation_expires_at: proposal.invitation_expires_at
      }));

      CacheManager.setCache(cacheKey, proposals);
      return proposals;
    } catch (error) {
      console.error('Error fetching proposals:', error);
      ErrorHandler.logSecurityEvent({
        type: 'access_denied',
        userId,
        resource: 'proposals',
        action: 'list',
        details: error
      });
      return [];
    }
  }
}
