
import { ProposalData, ProposalListItem } from '@/types/proposals';

/**
 * Transform raw proposal data from database to typed ProposalData
 */
export function transformToProposalData(rawProposal: any): ProposalData {
  return {
    id: rawProposal.id,
    title: rawProposal.title,
    status: rawProposal.status,
    content: rawProposal.content || {},
    created_at: rawProposal.created_at,
    signed_at: rawProposal.signed_at,
    archived_at: rawProposal.archived_at,
    review_later_until: rawProposal.review_later_until,
    deleted_at: rawProposal.deleted_at,
    client_id: rawProposal.client_id,
    client_reference_id: rawProposal.client_reference_id,
    agent_id: rawProposal.agent_id,
    annual_energy: rawProposal.annual_energy,
    carbon_credits: rawProposal.carbon_credits,
    client_share_percentage: rawProposal.client_share_percentage,
    agent_commission_percentage: rawProposal.agent_commission_percentage,
    system_size_kwp: rawProposal.system_size_kwp,
    unit_standard: rawProposal.unit_standard || 'kWp',
    invitation_token: rawProposal.invitation_token,
    invitation_expires_at: rawProposal.invitation_expires_at,
    invitation_sent_at: rawProposal.invitation_sent_at,
    invitation_viewed_at: rawProposal.invitation_viewed_at
  };
}

/**
 * Transform raw proposal data to ProposalListItem format with client and agent profiles
 */
export async function transformToProposalListItems(
  proposalsData: any[],
  clientProfiles: any[],
  agentProfiles: any[]
): Promise<ProposalListItem[]> {
  // Create lookup maps for profiles
  const clientProfileMap = new Map(clientProfiles.map(profile => [profile.id, profile]));
  const agentProfileMap = new Map(agentProfiles.map(profile => [profile.id, profile]));

  return proposalsData.map(proposal => {
    // Get client profile (check both client_id and client_reference_id)
    const clientProfile = clientProfileMap.get(proposal.client_id) || 
                         clientProfileMap.get(proposal.client_reference_id);
    
    // Get agent profile
    const agentProfile = agentProfileMap.get(proposal.agent_id);

    // Format client name and email
    const clientName = clientProfile 
      ? `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim() || 'Unknown Client'
      : 'Unknown Client';
    
    const clientEmail = clientProfile?.email || proposal.content?.clientInfo?.email || 'No email';

    // Format agent name
    const agentName = agentProfile 
      ? `${agentProfile.first_name || ''} ${agentProfile.last_name || ''}`.trim() || 'Unknown Agent'
      : 'Unknown Agent';

    return {
      id: proposal.id,
      title: proposal.title,
      status: proposal.status,
      created_at: proposal.created_at,
      signed_at: proposal.signed_at,
      archived_at: proposal.archived_at,
      review_later_until: proposal.review_later_until,
      client_id: proposal.client_id,
      client_reference_id: proposal.client_reference_id,
      agent_id: proposal.agent_id,
      client_name: clientName,
      client_email: clientEmail,
      agent_name: agentName,
      annual_energy: proposal.annual_energy,
      carbon_credits: proposal.carbon_credits,
      client_share_percentage: proposal.client_share_percentage,
      invitation_sent_at: proposal.invitation_sent_at,
      invitation_viewed_at: proposal.invitation_viewed_at,
      invitation_expires_at: proposal.invitation_expires_at,
      system_size_kwp: proposal.system_size_kwp
    };
  });
}

/**
 * Apply client-side sorting to proposals
 */
export function applyClientSideSorting(proposals: ProposalListItem[], sortBy: string): ProposalListItem[] {
  const sortedProposals = [...proposals];
  
  switch (sortBy) {
    case 'oldest':
      return sortedProposals.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    case 'title':
      return sortedProposals.sort((a, b) => a.title.localeCompare(b.title));
    case 'status':
      return sortedProposals.sort((a, b) => a.status.localeCompare(b.status));
    case 'newest':
    default:
      return sortedProposals.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}
