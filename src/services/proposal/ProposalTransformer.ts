
import { ProposalListItem } from '@/types/proposals';

export class ProposalTransformer {
  static transformToProposalListItem(rawProposal: any): ProposalListItem {
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

  static transformBatch(rawProposals: any[]): ProposalListItem[] {
    return rawProposals.map(proposal => this.transformToProposalListItem(proposal));
  }
}
