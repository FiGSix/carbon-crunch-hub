
import { supabase } from '@/integrations/supabase/client';
import { ProposalListItem } from '@/types/proposals';
import { cacheService } from '../cache/CacheService';

// Helper function to transform raw proposal data to ProposalListItem
function transformToProposalListItem(rawProposal: any): ProposalListItem {
  // Extract client and agent names
  const clientName = rawProposal.client 
    ? `${rawProposal.client.first_name || ''} ${rawProposal.client.last_name || ''}`.trim() || 'Unknown Client'
    : rawProposal.client_contact
    ? `${rawProposal.client_contact.first_name || ''} ${rawProposal.client_contact.last_name || ''}`.trim() || 'Unknown Client'
    : 'Unknown Client';

  const agentName = rawProposal.agent
    ? `${rawProposal.agent.first_name || ''} ${rawProposal.agent.last_name || ''}`.trim() || 'Unknown Agent'
    : 'Unknown Agent';

  // Calculate revenue (simplified calculation)
  const carbonCredits = rawProposal.carbon_credits || 0;
  const sharePercentage = rawProposal.client_share_percentage || 0;
  const revenue = carbonCredits && sharePercentage 
    ? Math.round(carbonCredits * 25 * (sharePercentage / 100))
    : 0;

  return {
    id: rawProposal.id,
    name: rawProposal.title || `Project ${rawProposal.id}`,
    title: rawProposal.title || `Project ${rawProposal.id}`,
    client: clientName,
    client_name: clientName,
    client_email: rawProposal.client?.email || rawProposal.client_contact?.email || 'No email',
    agent: agentName,
    agent_name: agentName,
    date: rawProposal.created_at,
    created_at: rawProposal.created_at,
    size: rawProposal.system_size_kwp || 0,
    system_size_kwp: rawProposal.system_size_kwp || 0,
    status: rawProposal.status,
    revenue: revenue,
    signed_at: rawProposal.signed_at,
    archived_at: rawProposal.archived_at,
    review_later_until: rawProposal.review_later_until,
    client_id: rawProposal.client_id,
    client_reference_id: rawProposal.client_reference_id,
    agent_id: rawProposal.agent_id,
    annual_energy: rawProposal.annual_energy,
    carbon_credits: rawProposal.carbon_credits,
    client_share_percentage: rawProposal.client_share_percentage,
    agent_commission_percentage: rawProposal.agent_commission_percentage,
    invitation_sent_at: rawProposal.invitation_sent_at,
    invitation_viewed_at: rawProposal.invitation_viewed_at,
    invitation_expires_at: rawProposal.invitation_expires_at,
    content: rawProposal.content
  };
}

export class ProposalService {
  static async getProposalsWithRelations(
    userId: string, 
    userRole: string, 
    forceRefresh = false
  ): Promise<ProposalListItem[]> {
    const cacheKey = `proposals_${userId}_${userRole}`;
    
    if (!forceRefresh) {
      const cached = cacheService.get<ProposalListItem[]>(cacheKey);
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
      const proposals = (data || []).map(transformToProposalListItem);
      cacheService.set(cacheKey, proposals, 3 * 60 * 1000); // 3 minutes for proposals

      return proposals;
    } catch (error) {
      console.error('Error fetching proposals:', error);
      return [];
    }
  }

  static async batchUpdateProposals(
    updates: Array<{ id: string; data: Partial<{ 
      status: string; 
      title: string; 
      carbon_credits: number;
      client_share_percentage: number;
      agent_commission_percentage: number;
      content: any; // Use any for Supabase Json compatibility
    }> }>
  ): Promise<{ success: boolean; errors: string[] }> {
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
      cacheService.invalidate('proposals_');

      return { success: errors.length === 0, errors };
    } catch (error: any) {
      return { success: false, errors: [error.message] };
    }
  }
}
