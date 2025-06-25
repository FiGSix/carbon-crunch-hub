
import { supabase } from '@/integrations/supabase/client';
import { ProposalListItem } from '@/types/proposals';
import { CacheManager } from '../cache/CacheManager';
import { RoleValidator } from '../utils/RoleValidator';
import { ErrorHandler } from '../utils/ErrorHandler';
import { transformToProposalListItems } from '@/utils/proposals/simplifiedTransformers';
import { UserRole } from '@/contexts/auth/types';

/**
 * Proposals data operations with enhanced security validation
 */
export class ProposalsDataService {
  static async getProposals(userId: string, userRole: UserRole, forceRefresh = false): Promise<ProposalListItem[]> {
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

      // Get unique client and agent IDs to fetch profiles
      const clientIds = new Set<string>();
      const agentIds = new Set<string>();

      data.forEach(proposal => {
        if (proposal.client_id) clientIds.add(proposal.client_id);
        if (proposal.client_reference_id) clientIds.add(proposal.client_reference_id);
        if (proposal.agent_id) agentIds.add(proposal.agent_id);
      });

      // Fetch client profiles
      let clientProfiles: any[] = [];
      if (clientIds.size > 0) {
        const { data: clientData, error: clientError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', Array.from(clientIds));

        if (!clientError && clientData) {
          clientProfiles = clientData;
        }
      }

      // Fetch agent profiles
      let agentProfiles: any[] = [];
      if (agentIds.size > 0) {
        const { data: agentData, error: agentError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', Array.from(agentIds));

        if (!agentError && agentData) {
          agentProfiles = agentData;
        }
      }

      // Transform proposals using the utility function
      const proposals = transformToProposalListItems(
        data,
        clientProfiles,
        agentProfiles,
        userRole
      );

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
