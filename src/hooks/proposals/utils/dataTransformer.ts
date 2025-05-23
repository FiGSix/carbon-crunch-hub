
import { supabase } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { ProposalListItem } from "@/types/proposals";
import { RawProposalData, ProfileData } from "../types";

/**
 * Transform raw proposal data into ProposalListItem format
 */
export async function fetchAndTransformProposalData(
  rawProposals: RawProposalData[]
): Promise<ProposalListItem[]> {
  const transformLogger = logger.withContext({ 
    component: 'DataTransformer', 
    feature: 'proposals' 
  });
  
  if (!rawProposals || rawProposals.length === 0) {
    return [];
  }

  try {
    // Collect all unique user IDs from client_id and agent_id
    const allUserIds = Array.from(new Set([
      ...rawProposals.map(p => p.client_id).filter(Boolean),
      ...rawProposals.map(p => p.agent_id).filter(Boolean)
    ]));

    // Collect all unique client reference IDs
    const allClientReferenceIds = Array.from(new Set(
      rawProposals.map(p => p.client_reference_id).filter(Boolean)
    ));

    // Collect all unique client contact IDs (legacy support)
    const allClientContactIds = Array.from(new Set(
      rawProposals.map(p => p.client_contact_id).filter(Boolean)
    ));

    // Fetch profiles for users (registered clients and agents)
    let profilesData: ProfileData[] = [];
    if (allUserIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', allUserIds);

      if (profilesError) {
        transformLogger.error("Error fetching profiles", { error: profilesError });
      } else {
        profilesData = profiles || [];
      }
    }

    // Fetch client records for non-registered clients
    let clientsData: any[] = [];
    const allClientIds = [...allClientReferenceIds, ...allClientContactIds];
    if (allClientIds.length > 0) {
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email, is_registered_user')
        .in('id', allClientIds);

      if (clientsError) {
        transformLogger.error("Error fetching clients", { error: clientsError });
      } else {
        clientsData = clients || [];
      }
    }

    // Transform each proposal
    const transformedProposals = rawProposals.map((proposal): ProposalListItem => {
      // Get client information - prioritize registered user data
      let clientName = 'Unknown Client';
      let clientEmail = '';
      
      if (proposal.client_id) {
        // Look for registered user first
        const clientProfile = profilesData.find(p => p.id === proposal.client_id);
        if (clientProfile) {
          clientName = `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim() || clientProfile.email;
          clientEmail = clientProfile.email;
        }
      }
      
      // If no registered user found, look in clients table
      if (clientName === 'Unknown Client') {
        const referenceId = proposal.client_reference_id || proposal.client_contact_id;
        if (referenceId) {
          const clientRecord = clientsData.find(c => c.id === referenceId);
          if (clientRecord) {
            clientName = `${clientRecord.first_name || ''} ${clientRecord.last_name || ''}`.trim() || clientRecord.email;
            clientEmail = clientRecord.email;
          }
        }
      }
      
      // Fallback to content if still no client found
      if (clientName === 'Unknown Client' && proposal.content) {
        try {
          const content = typeof proposal.content === 'string' 
            ? JSON.parse(proposal.content) 
            : proposal.content;
          
          if (content?.clientInfo?.name) {
            clientName = content.clientInfo.name;
          } else if (content?.clientInfo?.email) {
            clientName = content.clientInfo.email;
            clientEmail = content.clientInfo.email;
          }
        } catch (error) {
          transformLogger.warn("Error parsing proposal content", { 
            proposalId: proposal.id, 
            error 
          });
        }
      }

      // Get agent information
      let agentName = '';
      if (proposal.agent_id) {
        const agentProfile = profilesData.find(p => p.id === proposal.agent_id);
        if (agentProfile) {
          agentName = `${agentProfile.first_name || ''} ${agentProfile.last_name || ''}`.trim() || agentProfile.email;
        }
      }

      return {
        id: proposal.id,
        name: proposal.title,
        client: clientName,
        date: new Date(proposal.created_at).toLocaleDateString(),
        size: proposal.annual_energy || 0,
        status: proposal.status,
        revenue: proposal.carbon_credits || 0,
        invitation_sent_at: proposal.invitation_sent_at,
        invitation_viewed_at: proposal.invitation_viewed_at,
        invitation_expires_at: proposal.invitation_expires_at,
        review_later_until: proposal.review_later_until,
        agent_id: proposal.agent_id,
        agent: agentName,
        is_preview: proposal.is_preview,
        preview_of_id: proposal.preview_of_id
      };
    });

    transformLogger.info("Successfully transformed proposals", { 
      count: transformedProposals.length,
      profileCount: profilesData.length,
      clientCount: clientsData.length
    });

    return transformedProposals;
  } catch (error) {
    transformLogger.error("Error transforming proposal data", { error });
    throw error;
  }
}
