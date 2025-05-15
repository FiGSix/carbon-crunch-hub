
import { RawProposalData, ProfileData } from "../types";
import { Proposal } from "@/components/proposals/ProposalList";
import { fetchProfilesByIds } from "../api/fetchProfiles";
import { logger } from "@/lib/logger";

/**
 * Fetches related profiles and transforms proposal data
 */
export async function fetchAndTransformProposalData(
  proposalsData: RawProposalData[]
): Promise<Proposal[]> {
  const transformLogger = logger.withContext({
    component: 'DataTransformer',
    feature: 'proposals'
  });
  
  if (!proposalsData || proposalsData.length === 0) {
    transformLogger.info("No proposals data to transform");
    return [];
  }
  
  transformLogger.info("Transforming proposal data", { count: proposalsData.length });
  
  // Extract IDs for related data
  const clientIds = proposalsData.map(p => p.client_id).filter(Boolean);
  const agentIds = proposalsData
    .map(p => p.agent_id)
    .filter((id): id is string => id !== null && id !== undefined);
  
  // Fetch related profiles
  const [clientProfiles, agentProfiles] = await Promise.all([
    fetchProfilesByIds(clientIds),
    fetchProfilesByIds(agentIds)
  ]);
  
  // Transform the proposals data using the existing helper
  const transformedProposals = transformProposalData(
    proposalsData,
    clientProfiles,
    agentProfiles
  );
  
  transformLogger.info("Transformed proposals", { count: transformedProposals.length });
  return transformedProposals;
}

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
      
    // Parse size safely from content
    let size = 0;
    if (item.content && typeof item.content === 'object' && !Array.isArray(item.content)) {
      const contentObj = item.content as Record<string, any>;
      
      if (contentObj.projectInfo && typeof contentObj.projectInfo === 'object') {
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
      agent: agentName,
      is_preview: item.is_preview,
      preview_of_id: item.preview_of_id
    };
  });
}
