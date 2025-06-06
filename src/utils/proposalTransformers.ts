import { ProposalData, ProposalListItem } from '@/types/proposals';
import { dynamicCarbonPricingService } from '@/lib/calculations/carbon/dynamicPricing';
import { UserRole } from '@/contexts/auth/types';

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
 * Extract and convert system size from various sources
 */
function extractSystemSize(proposal: any): number {
  // First check if system_size_kwp column has a value
  if (proposal.system_size_kwp && proposal.system_size_kwp > 0) {
    return Number(proposal.system_size_kwp);
  }
  
  // Fall back to project_info.size if available
  if (proposal.project_info?.size) {
    const sizeString = proposal.project_info.size.toString().trim();
    
    // Extract numeric value from string (handle cases like "350 kWp", "14.8 MWp", etc.)
    const numericMatch = sizeString.match(/^(\d+(?:\.\d+)?)/);
    if (numericMatch) {
      const numericValue = parseFloat(numericMatch[1]);
      
      // Check if it's in MWp and convert to kWp
      if (sizeString.toLowerCase().includes('mwp') || sizeString.toLowerCase().includes('mw')) {
        return numericValue * 1000;
      }
      
      // Default to kWp
      return numericValue;
    }
  }
  
  // Also check content.projectInfo.size as a fallback
  if (proposal.content?.projectInfo?.size) {
    const sizeString = proposal.content.projectInfo.size.toString().trim();
    
    const numericMatch = sizeString.match(/^(\d+(?:\.\d+)?)/);
    if (numericMatch) {
      const numericValue = parseFloat(numericMatch[1]);
      
      if (sizeString.toLowerCase().includes('mwp') || sizeString.toLowerCase().includes('mw')) {
        return numericValue * 1000;
      }
      
      return numericValue;
    }
  }
  
  // Return 0 if no valid size found
  return 0;
}

/**
 * Extract client name from multiple sources with proper fallback hierarchy
 */
function extractClientName(proposal: any, clientProfile: any): string {
  // First try: client profile from client_id/client_reference_id
  if (clientProfile) {
    const profileName = `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim();
    if (profileName) {
      return profileName;
    }
  }
  
  // Second try: company name from proposal content
  if (proposal.content?.clientInfo?.companyName) {
    return proposal.content.clientInfo.companyName;
  }
  
  // Third try: client name from proposal content
  if (proposal.content?.clientInfo?.name) {
    return proposal.content.clientInfo.name;
  }
  
  // Final fallback
  return 'Unknown Client';
}

/**
 * Calculate revenue using dynamic carbon pricing
 */
async function calculateProposalRevenue(
  carbonCredits: number, 
  clientSharePercentage: number, 
  commissionDate?: string
): Promise<number> {
  if (!carbonCredits || !clientSharePercentage) {
    return 0;
  }

  try {
    // Get current year carbon price as the baseline
    const currentYear = new Date().getFullYear();
    const carbonPrice = await dynamicCarbonPricingService.getCarbonPriceForYear(currentYear);
    
    if (!carbonPrice) {
      console.warn('No carbon price found for current year, using fallback calculation');
      return 0;
    }

    // Calculate total revenue: carbon credits * price per credit * client share
    const totalRevenue = carbonCredits * carbonPrice * (clientSharePercentage / 100);
    
    return Math.round(totalRevenue);
  } catch (error) {
    console.error('Error calculating proposal revenue:', error);
    return 0;
  }
}

/**
 * Calculate agent commission revenue using dynamic carbon pricing
 */
async function calculateAgentCommissionRevenue(
  carbonCredits: number, 
  agentCommissionPercentage: number, 
  commissionDate?: string
): Promise<number> {
  if (!carbonCredits || !agentCommissionPercentage) {
    return 0;
  }

  try {
    // Get current year carbon price as the baseline
    const currentYear = new Date().getFullYear();
    const carbonPrice = await dynamicCarbonPricingService.getCarbonPriceForYear(currentYear);
    
    if (!carbonPrice) {
      console.warn('No carbon price found for current year, using fallback calculation');
      return 0;
    }

    // Calculate agent commission revenue: carbon credits * price per credit * agent commission
    const commissionRevenue = carbonCredits * carbonPrice * (agentCommissionPercentage / 100);
    
    return Math.round(commissionRevenue);
  } catch (error) {
    console.error('Error calculating agent commission revenue:', error);
    return 0;
  }
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

      // Use the new client name extraction function
      const clientName = extractClientName(proposal, clientProfile);
      
      const clientEmail = clientProfile?.email || proposal.content?.clientInfo?.email || 'No email';

      // Format agent name
      const agentName = agentProfile 
        ? `${agentProfile.first_name || ''} ${agentProfile.last_name || ''}`.trim() || 'Unknown Agent'
        : 'Unknown Agent';

      // Extract system size from multiple sources
      const systemSizeKwp = extractSystemSize(proposal);

      // Calculate revenue based on user role
      let revenue = 0;
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

      return {
        id: proposal.id,
        name: proposal.title, // Map title to name for display
        client: clientName, // Use the extracted client name
        date: proposal.created_at, // Map created_at to date for display
        size: systemSizeKwp, // Map extracted system size to size for display
        status: proposal.status,
        revenue: revenue,
        // Keep all original fields for compatibility
        title: proposal.title,
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
        agent_commission_percentage: proposal.agent_commission_percentage, // Add this field
        invitation_sent_at: proposal.invitation_sent_at,
        invitation_viewed_at: proposal.invitation_viewed_at,
        invitation_expires_at: proposal.invitation_expires_at,
        system_size_kwp: systemSizeKwp // Use the extracted system size
      };
    })
  );

  return transformedProposals;
}

/**
 * Apply client-side sorting to proposals
 */
export function applyClientSideSorting(proposals: ProposalListItem[], sortBy: string): ProposalListItem[] {
  const sortedProposals = [...proposals];
  
  switch (sortBy) {
    case 'oldest':
      return sortedProposals.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    case 'title':
      return sortedProposals.sort((a, b) => a.name.localeCompare(b.name));
    case 'status':
      return sortedProposals.sort((a, b) => a.status.localeCompare(b.status));
    case 'newest':
    default:
      return sortedProposals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}
