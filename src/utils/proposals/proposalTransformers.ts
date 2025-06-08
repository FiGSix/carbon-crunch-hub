/**
 * Main transformation functions for proposals
 */
import { ProposalData, ProposalListItem } from '@/types/proposals';
import { UserRole } from '@/contexts/auth/types';
import { extractSystemSize, extractClientName } from './dataExtractors';
import { calculateProposalRevenue, calculateAgentCommissionRevenue } from './revenueCalculators';

/**
 * Transform raw proposal data from database to typed ProposalData
 */
export function transformToProposalData(rawProposal: any): ProposalData {
  return {
    id: rawProposal.id,
    title: rawProposal.content?.title || rawProposal.content?.projectInfo?.name || `Project ${rawProposal.id}`,
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
  agentProfiles: any[],
  userRole?: UserRole | null
): Promise<ProposalListItem[]> {
  // Create lookup maps for profiles
  const clientProfileMap = new Map(clientProfiles.map(profile => [profile.id, profile]));
  const agentProfileMap = new Map(agentProfiles.map(profile => [profile.id, profile]));

  // Process all proposals in parallel to get their revenues
  const transformedProposals = await Promise.all(
    proposalsData.map(async (proposal) => {
      // Get client profile (check both client_id and client_reference_id)
      const clientProfile = clientProfileMap.get(proposal.client_id) || 
                           clientProfileMap.get(proposal.client_reference_id);
      
      // Get agent profile
      const agentProfile = agentProfileMap.get(proposal.agent_id);

      // Use the extracted client name function
      const clientName = extractClientName(proposal, clientProfile);
      
      const clientEmail = clientProfile?.email || proposal.content?.clientInfo?.email || 'No email';

      // Format agent name
      const agentName = agentProfile 
        ? `${agentProfile.first_name || ''} ${agentProfile.last_name || ''}`.trim() || 'Unknown Agent'
        : 'Unknown Agent';

      // Extract system size from multiple sources
      const systemSizeKwp = extractSystemSize(proposal);

      // Extract proposal title/name
      const proposalTitle = proposal.content?.title || proposal.content?.projectInfo?.name || `Project ${proposal.id}`;

      // Calculate revenue based on user role
      let revenue = 0;
      try {
        if (userRole === 'agent') {
          // For agents, show their commission revenue
          revenue = await calculateAgentCommissionRevenue(
            proposal.carbon_credits || 0,
            proposal.agent_commission_percentage || 0,
            proposal.content?.projectInfo?.commissionDate
          );
        } else {
          // For clients and admins, show client revenue
          revenue = await calculateProposalRevenue(
            proposal.carbon_credits || 0,
            proposal.client_share_percentage || 0,
            proposal.content?.projectInfo?.commissionDate
          );
        }
      } catch (error) {
        console.warn('Error calculating revenue for proposal', proposal.id, error);
        revenue = 0;
      }

      return {
        id: proposal.id,
        name: proposalTitle, // Map title to name for display
        client: clientName, // Use the extracted client name
        date: proposal.created_at, // Map created_at to date for display
        size: systemSizeKwp, // Map extracted system size to size for display
        status: proposal.status,
        revenue: revenue,
        // Keep all original fields for compatibility
        title: proposalTitle,
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
        agent: agentName, // Also map to agent for backward compatibility
        annual_energy: proposal.annual_energy,
        carbon_credits: proposal.carbon_credits,
        client_share_percentage: proposal.client_share_percentage,
        agent_commission_percentage: proposal.agent_commission_percentage,
        invitation_sent_at: proposal.invitation_sent_at,
        invitation_viewed_at: proposal.invitation_viewed_at,
        invitation_expires_at: proposal.invitation_expires_at,
        system_size_kwp: systemSizeKwp,
        content: proposal.content // Add content property to fix build errors
      };
    })
  );

  return transformedProposals;
}
