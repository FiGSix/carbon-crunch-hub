
import { Proposal } from "@/components/proposals/types";
import { ProfileData, RawProposalData } from "./types";

/**
 * Transforms raw proposal data from the database into the Proposal interface format
 */
export function transformProposalData(
  proposalsData: RawProposalData[],
  clientProfiles: Record<string, ProfileData>,
  agentProfiles: Record<string, ProfileData>
): Proposal[] {
  return proposalsData.map(item => {
    // Get client profile from our map
    const clientProfile = clientProfiles[item.client_id];
    
    // Get agent profile from our map
    const agentProfile = item.agent_id ? agentProfiles[item.agent_id] : null;
    
    // Handle different return types from Supabase
    const clientName = clientProfile 
      ? `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim() 
      : 'Unknown Client';
      
    const agentName = agentProfile 
      ? `${agentProfile.first_name || ''} ${agentProfile.last_name || ''}`.trim() 
      : 'Unassigned';
      
    // Parse size safely from content - making sure to check types properly for TypeScript
    let size = 0;
    if (item.content && typeof item.content === 'object' && !Array.isArray(item.content)) {
      // Now TypeScript knows content is an object, not an array
      const contentObj = item.content as Record<string, any>;
      
      // Check if projectInfo exists and is an object
      if (contentObj.projectInfo && typeof contentObj.projectInfo === 'object') {
        // Access size property safely
        if ('size' in contentObj.projectInfo) {
          const sizeValue = contentObj.projectInfo.size;
          size = parseFloat(String(sizeValue) || '0');
        }
      }
    }

    // Calculate revenue from carbon credits and client share
    const revenue = item.carbon_credits && item.client_share_percentage 
      ? (item.carbon_credits * (item.client_share_percentage / 100))
      : item.carbon_credits ? item.carbon_credits * 100 : 0; // Simplified revenue calculation fallback
      
    return {
      id: item.id,
      name: item.title, // Map title to name for display
      client: clientName, // Map client_name to client for display
      date: item.created_at.substring(0, 10), // Format date as YYYY-MM-DD
      size: size,
      status: item.status,
      revenue: revenue,
      // Include all required fields from ProposalListItem interface
      created_at: item.created_at,
      title: item.title,
      signed_at: null, // Not available in RawProposalData
      archived_at: null, // Not available in RawProposalData
      review_later_until: item.review_later_until,
      client_id: item.client_id,
      client_reference_id: item.client_reference_id,
      agent_id: item.agent_id,
      client_name: clientName,
      client_email: clientProfile?.email || 'No email',
      agent_name: agentName,
      agent: agentName, // Also map to agent for backward compatibility
      annual_energy: item.annual_energy,
      carbon_credits: item.carbon_credits,
      client_share_percentage: item.client_share_percentage,
      invitation_sent_at: item.invitation_sent_at,
      invitation_viewed_at: item.invitation_viewed_at,
      invitation_expires_at: item.invitation_expires_at,
      system_size_kwp: null // Not available in RawProposalData
    };
  });
}

/**
 * Applies client-side sorting to proposals
 */
export function applyClientSideSorting(proposals: Proposal[], sortType: string): Proposal[] {
  const sortedProposals = [...proposals];
  
  if (sortType === 'size-high') {
    sortedProposals.sort((a, b) => b.size - a.size);
  } else if (sortType === 'size-low') {
    sortedProposals.sort((a, b) => a.size - b.size);
  }
  
  return sortedProposals;
}
