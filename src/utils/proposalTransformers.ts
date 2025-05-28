
import { ProposalListItem } from "@/types/proposals";
import { calculateRevenue, formatSystemSizeForDisplay, normalizeToKWp } from "@/lib/calculations/carbon";

interface RawProposalData {
  id: string;
  title: string;
  content: any;
  status: string;
  created_at: string;
  client_id: string;
  client_reference_id: string | null;
  agent_id: string | null;
  annual_energy: number | null;
  carbon_credits: number | null;
  client_share_percentage: number | null;
  invitation_sent_at: string | null;
  invitation_viewed_at: string | null;
  invitation_expires_at: string | null;
  review_later_until: string | null;
  is_preview: boolean | null;
  preview_of_id: string | null;
  system_size_kwp?: number | null;
  unit_standard?: string | null;
}

interface ProfileData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

/**
 * Transform raw proposal data with profile information into ProposalListItem format
 */
export function transformToProposalListItems(
  proposalsData: RawProposalData[],
  clientProfiles: ProfileData[],
  agentProfiles: ProfileData[]
): ProposalListItem[] {
  return proposalsData.map(proposal => {
    // Get client name
    const clientProfile = clientProfiles.find(p => 
      p.id === proposal.client_id || p.id === proposal.client_reference_id
    );
    
    const clientName = clientProfile 
      ? `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim()
      : proposal.content?.clientInfo?.name || 'Unknown Client';

    // Get agent name  
    const agentProfile = agentProfiles.find(p => p.id === proposal.agent_id);
    const agentName = agentProfile 
      ? `${agentProfile.first_name || ''} ${agentProfile.last_name || ''}`.trim()
      : 'Unassigned';

    // Get system size - prioritize the normalized database field
    let systemSizeInKWp: number;
    
    if (proposal.system_size_kwp !== null && proposal.system_size_kwp !== undefined) {
      // Use the normalized database field
      systemSizeInKWp = proposal.system_size_kwp;
    } else if (proposal.content?.projectInfo?.size) {
      // Fall back to parsing from content and normalize
      systemSizeInKWp = normalizeToKWp(proposal.content.projectInfo.size);
    } else {
      systemSizeInKWp = 0;
    }

    // Calculate revenue based on the normalized system size
    const projectCommissionDate = proposal.content?.projectInfo?.commissionDate;
    const revenue = calculateRevenue(systemSizeInKWp, projectCommissionDate, 'kWp');
    const totalRevenue = Object.values(revenue).reduce((sum, amount) => sum + amount, 0);

    return {
      id: proposal.id,
      name: proposal.title,
      client: clientName,
      date: proposal.created_at,
      size: systemSizeInKWp, // Store normalized size in kWp
      status: proposal.status,
      revenue: totalRevenue,
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
}
