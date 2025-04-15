
import { Proposal } from "@/components/proposals/ProposalList";
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
      
    return {
      id: item.id,
      name: item.title,
      client: clientName,
      date: item.created_at.substring(0, 10), // Format date as YYYY-MM-DD
      size: size,
      status: item.status,
      revenue: item.carbon_credits ? item.carbon_credits * 100 : 0, // Simplified revenue calculation
      invitation_sent_at: item.invitation_sent_at,
      invitation_viewed_at: item.invitation_viewed_at,
      invitation_expires_at: item.invitation_expires_at,
      review_later_until: item.review_later_until,
      agent_id: item.agent_id,
      agent: agentName
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
