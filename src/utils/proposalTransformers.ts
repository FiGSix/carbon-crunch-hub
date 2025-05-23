
import { 
  ProposalDbRecord,
  ProposalData, 
  ProposalListItem, 
  ClientInformation,
  ProjectInformation
} from "@/types/proposals";

type ProfileRecord = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
};

/**
 * Transforms a raw database proposal record to the ProposalData format used by components
 */
export function transformToProposalData(record: any): ProposalData {
  return {
    id: record.id,
    title: record.title,
    status: record.status,
    content: record.content as any,
    client_id: record.client_id,
    client_reference_id: record.client_reference_id,
    client_contact_id: record.client_contact_id,
    agent_id: record.agent_id,
    created_at: record.created_at,
    signed_at: record.signed_at,
    invitation_viewed_at: record.invitation_viewed_at,
    archived_at: record.archived_at,
    archived_by: record.archived_by,
    review_later_until: record.review_later_until,
    is_preview: record.is_preview,
    preview_of_id: record.preview_of_id
  };
}

/**
 * Transforms database proposal records to list item format for use in proposal lists
 */
export function transformToProposalListItems(
  proposalsData: any[],
  clientProfiles: Record<string, ProfileRecord>,
  agentProfiles: Record<string, ProfileRecord>
): ProposalListItem[] {
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
      
    // Parse size safely from content
    let size = 0;
    const content = item.content as any;
    
    if (content?.projectInfo?.size) {
      size = parseFloat(String(content.projectInfo.size) || '0');
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
      agent: agentName,
      is_preview: item.is_preview,
      preview_of_id: item.preview_of_id
    };
  });
}

/**
 * Applies client-side sorting to proposal list items
 */
export function applyClientSideSorting(proposals: ProposalListItem[], sortType: string): ProposalListItem[] {
  const sortedProposals = [...proposals];
  
  if (sortType === 'size-high') {
    sortedProposals.sort((a, b) => b.size - a.size);
  } else if (sortType === 'size-low') {
    sortedProposals.sort((a, b) => a.size - b.size);
  }
  
  return sortedProposals;
}
