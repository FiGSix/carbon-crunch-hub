
/**
 * Simplified proposal transformers
 */
import { ProposalData, ProposalListItem } from '@/types/proposals';
import { UserRole } from '@/contexts/auth/types';

/**
 * Transform raw proposal data to ProposalData
 */
export function transformToProposalData(rawProposal: any): ProposalData {
  return {
    id: rawProposal.id,
    title: rawProposal.title || `Project ${rawProposal.id}`,
    status: rawProposal.status,
    content: rawProposal.content || {},
    created_at: rawProposal.created_at,
    signed_at: rawProposal.signed_at,
    archived_at: rawProposal.archived_at,
    deleted_at: rawProposal.deleted_at,
    review_later_until: rawProposal.review_later_until,
    client_id: rawProposal.client_id,
    client_reference_id: rawProposal.client_reference_id,
    agent_id: rawProposal.agent_id,
    annual_energy: rawProposal.annual_energy,
    carbon_credits: rawProposal.carbon_credits,
    client_share_percentage: rawProposal.client_share_percentage,
    agent_commission_percentage: rawProposal.agent_commission_percentage,
    system_size_kwp: rawProposal.system_size_kwp,
    unit_standard: 'kWp',
    invitation_token: rawProposal.invitation_token,
    invitation_expires_at: rawProposal.invitation_expires_at,
    invitation_sent_at: rawProposal.invitation_sent_at,
    invitation_viewed_at: rawProposal.invitation_viewed_at
  };
}

/**
 * Transform to ProposalListItem with simplified revenue calculation
 */
export function transformToProposalListItems(
  proposalsData: any[],
  clientProfiles: any[],
  agentProfiles: any[],
  userRole?: UserRole | null
): ProposalListItem[] {
  const clientProfileMap = new Map(clientProfiles.map(profile => [profile.id, profile]));
  const agentProfileMap = new Map(agentProfiles.map(profile => [profile.id, profile]));

  return proposalsData.map((proposal) => {
    // Get profiles
    const clientProfile = clientProfileMap.get(proposal.client_id) || 
                         clientProfileMap.get(proposal.client_reference_id);
    const agentProfile = agentProfileMap.get(proposal.agent_id);

    // Extract basic info
    const clientName = clientProfile 
      ? `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim() || 'Unknown Client'
      : proposal.content?.clientInfo?.name || 'Unknown Client';
    
    const clientEmail = clientProfile?.email || proposal.content?.clientInfo?.email || 'No email';
    const agentName = agentProfile 
      ? `${agentProfile.first_name || ''} ${agentProfile.last_name || ''}`.trim() || 'Unknown Agent'
      : 'Unknown Agent';

    // Simple revenue calculation
    const carbonCredits = proposal.carbon_credits || 0;
    const sharePercentage = userRole === 'agent' 
      ? proposal.agent_commission_percentage || 0
      : proposal.client_share_percentage || 0;
    
    const revenue = carbonCredits && sharePercentage 
      ? Math.round(carbonCredits * 25 * (sharePercentage / 100)) // Simple fixed price
      : 0;

    return {
      id: proposal.id,
      name: proposal.title || `Project ${proposal.id}`,
      title: proposal.title || `Project ${proposal.id}`,
      client: clientName,
      client_name: clientName,
      client_email: clientEmail,
      agent: agentName,
      agent_name: agentName,
      date: proposal.created_at,
      created_at: proposal.created_at,
      size: proposal.system_size_kwp || 0,
      system_size_kwp: proposal.system_size_kwp || 0,
      status: proposal.status,
      revenue: revenue,
      signed_at: proposal.signed_at,
      archived_at: proposal.archived_at,
      review_later_until: proposal.review_later_until,
      client_id: proposal.client_id,
      client_reference_id: proposal.client_reference_id,
      agent_id: proposal.agent_id,
      annual_energy: proposal.annual_energy,
      carbon_credits: proposal.carbon_credits,
      client_share_percentage: proposal.client_share_percentage,
      agent_commission_percentage: proposal.agent_commission_percentage,
      invitation_sent_at: proposal.invitation_sent_at,
      invitation_viewed_at: proposal.invitation_viewed_at,
      invitation_expires_at: proposal.invitation_expires_at,
      content: proposal.content
    };
  });
}
