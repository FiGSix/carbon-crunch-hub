
/**
 * Simplified proposal transformers - using UnifiedCarbonService
 */
import { ProposalData, ProposalListItem } from '@/types/proposals';
import { UserRole } from '@/contexts/auth/types';
import { UnifiedCarbonService } from '@/services/calculations/carbon';

/**
 * Transform raw proposal data to ProposalData
 * Normalizes content.projectInfo and content.clientInfo to handle both:
 * - Normal proposals: camelCase (size, commissionDate, companyName)
 * - Partner API proposals: snake_case (system_size_kwp, commissioning_date, company_name)
 */
export function transformToProposalData(rawProposal: any): ProposalData {
  const rawContent = rawProposal.content || {};
  const rawProjectInfo = rawContent.projectInfo || {};
  const rawClientInfo = rawContent.clientInfo || {};

  // Normalize projectInfo: handle partner API snake_case → frontend camelCase
  const normalizedProjectInfo = {
    ...rawProjectInfo,
    size: rawProjectInfo.size
      || (rawProjectInfo.system_size_kwp ? String(rawProjectInfo.system_size_kwp) : '')
      || (rawProposal.system_size_kwp ? String(rawProposal.system_size_kwp) : ''),
    commissionDate: rawProjectInfo.commissionDate
      || rawProjectInfo.commissioning_date
      || '',
    isMultiPhase: rawProjectInfo.isMultiPhase || false,
    additionalNotes: rawProjectInfo.additionalNotes || '',
  };

  // Normalize clientInfo: handle partner API snake_case company_name → camelCase companyName
  const normalizedClientInfo = {
    ...rawClientInfo,
    name: rawClientInfo.name
      || `${rawClientInfo.first_name || ''} ${rawClientInfo.last_name || ''}`.trim()
      || '',
    companyName: rawClientInfo.companyName || rawClientInfo.company_name || '',
  };

  return {
    id: rawProposal.id,
    title: rawProposal.title || `Project ${rawProposal.id}`,
    status: rawProposal.status,
    content: {
      ...rawContent,
      clientInfo: normalizedClientInfo,
      projectInfo: normalizedProjectInfo,
    },
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
    invitation_viewed_at: rawProposal.invitation_viewed_at,
    // Resolve client_reference_id → user_id for identity matching
    client_reference_user_id: rawProposal.client?.user_id || null,
    // Preserve joined client record for live data resolution
    client: rawProposal.client || null
  };
}

/**
 * Transform to ProposalListItem with simplified revenue calculation using UnifiedCarbonService
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
    // Get profiles - check clients table first (client_reference_id), then profiles table (client_id)
    const clientProfile = clientProfileMap.get(proposal.client_reference_id) || 
                         clientProfileMap.get(proposal.client_id);
    const agentProfile = agentProfileMap.get(proposal.agent_id);

    // Extract basic info
    const clientName = clientProfile 
      ? `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim() || 'Unknown Client'
      : proposal.content?.clientInfo?.name || 'Unknown Client';
    
    const clientEmail = clientProfile?.email || proposal.content?.clientInfo?.email || 'No email';
    const agentName = agentProfile 
      ? `${agentProfile.first_name || ''} ${agentProfile.last_name || ''}`.trim() || 'Unknown Agent'
      : 'Unknown Agent';

    // Use stored calculations or calculate using unified service
    const carbonCredits = proposal.carbon_credits || 0;
    const sharePercentage = userRole === 'agent' 
      ? proposal.agent_commission_percentage || 0
      : proposal.client_share_percentage || 0;
    
    // Simple revenue calculation using standard carbon price
    const revenue = carbonCredits && sharePercentage 
      ? Math.round(carbonCredits * 25 * (sharePercentage / 100)) // Using standard 25 AUD price
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
      client_share_override_enabled: proposal.client_share_override_enabled,
      agent_commission_percentage: proposal.agent_commission_percentage,
      agent_portfolio_kwp: proposal.agent_portfolio_kwp,
      invitation_sent_at: proposal.invitation_sent_at,
      invitation_viewed_at: proposal.invitation_viewed_at,
      invitation_expires_at: proposal.invitation_expires_at,
      content: proposal.content,
      isMultiPhase: proposal.content?.projectInfo?.isMultiPhase || proposal.project_info?.isMultiPhase || false,
      phases: proposal.content?.projectInfo?.phases || proposal.project_info?.phases || undefined,
      last_email_event_type: proposal.last_email_event_type,
      last_email_sent_at: proposal.last_email_sent_at,
      engagement_count: proposal.engagement_count,
      last_engagement_at: proposal.last_engagement_at,
      onboarding_complete: proposal.onboarding_complete,
      submitted_for_review: proposal.submitted_for_review,
      admin_validated: proposal.admin_validated,
      audit_ready: proposal.audit_ready
    };
  });
}
