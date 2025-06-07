
import { EligibilityCriteria, ProjectInformation, ClientInformation } from "@/types/proposals";
import { ProposalData } from "./types";

export function transformProposalData(
  insertedProposal: any,
  clientInfo: ClientInformation
): ProposalData {
  return {
    id: insertedProposal.id,
    title: insertedProposal.title,
    agent_id: insertedProposal.agent_id,
    eligibility_criteria: insertedProposal.eligibility_criteria as unknown as EligibilityCriteria,
    project_info: insertedProposal.project_info as unknown as ProjectInformation,
    client_info: clientInfo,
    annual_energy: insertedProposal.annual_energy || 0,
    carbon_credits: insertedProposal.carbon_credits || 0,
    client_share: insertedProposal.client_share_percentage || 0,
    agent_commission: insertedProposal.agent_commission_percentage || 0,
    client_id: insertedProposal.client_id,
    client_reference_id: insertedProposal.client_reference_id,
    status: insertedProposal.status,
    system_size_kwp: insertedProposal.system_size_kwp,
    unit_standard: insertedProposal.unit_standard,
    client_share_percentage: insertedProposal.client_share_percentage,
    agent_commission_percentage: insertedProposal.agent_commission_percentage,
    content: {
      ...insertedProposal.content,
      // Ensure backward compatibility while supporting new structure
      revenue: insertedProposal.content?.clientSpecificRevenue || insertedProposal.content?.revenue || {},
      marketRevenue: insertedProposal.content?.marketRevenue || {},
      clientSpecificRevenue: insertedProposal.content?.clientSpecificRevenue || {},
      agentCommissionRevenue: insertedProposal.content?.agentCommissionRevenue || {},
      crunchCommissionRevenue: insertedProposal.content?.crunchCommissionRevenue || {},
      portfolioSize: insertedProposal.content?.portfolioSize || 0,
      calculationMetadata: insertedProposal.content?.calculationMetadata || {}
    },
    created_at: insertedProposal.created_at
  };
}
