
import { supabase } from "@/integrations/supabase/client";
import { EligibilityCriteria, ClientInformation, ProjectInformation } from "@/types/proposals";
import { logger } from "@/lib/logger";
import { normalizeToKWp } from "@/lib/calculations/carbon/normalization";
import { calculateAnnualEnergy, calculateCarbonCredits } from "@/lib/calculations/carbon";
import type { Database } from "@/integrations/supabase/types";

type ProposalInsert = Database['public']['Tables']['proposals']['Insert'];

/**
 * Unified proposal service - handles all proposal operations in one place
 */

// Simple portfolio calculations
function calculateClientSharePercentage(portfolioKWp: number): number {
  if (portfolioKWp < 5000) return 63;
  if (portfolioKWp < 10000) return 66.5;
  if (portfolioKWp < 20000) return 67.9;
  if (portfolioKWp < 30000) return 70;
  return 73.5;
}

function calculateAgentCommissionPercentage(portfolioKWp: number): number {
  return portfolioKWp < 15000 ? 4 : 7;
}

// Simple client management
async function findOrCreateClient(clientInfo: ClientInformation, agentId: string): Promise<string> {
  const normalizedEmail = clientInfo.email.toLowerCase().trim();
  
  // Try to find existing client
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();
  
  if (existingClient) {
    return existingClient.id;
  }
  
  // Create new client
  const { data: newClient, error } = await supabase
    .from('clients')
    .insert({
      first_name: clientInfo.name.split(' ')[0] || clientInfo.name,
      last_name: clientInfo.name.split(' ').slice(1).join(' ') || null,
      email: normalizedEmail,
      phone: clientInfo.phone || null,
      company_name: clientInfo.companyName || null,
      created_by: agentId
    })
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to create client: ${error.message}`);
  }
  
  return newClient.id;
}

// Get portfolio sizes
async function getPortfolioSize(query: any): Promise<number> {
  const { data } = await query;
  return data?.reduce((total: number, p: any) => total + (p.system_size_kwp || 0), 0) || 0;
}

/**
 * Create a proposal - unified function that handles everything
 */
export async function createProposal(
  proposalTitle: string,
  agentId: string,
  eligibilityCriteria: EligibilityCriteria,
  projectInfo: ProjectInformation,
  clientInfo: ClientInformation,
  selectedClientId?: string
): Promise<{ success: boolean; proposalId?: string; error?: string }> {
  const proposalLogger = logger.withContext({
    component: 'UnifiedProposalService',
    method: 'createProposal'
  });

  try {
    proposalLogger.info("Creating proposal", { 
      proposalTitle, 
      agentId, 
      selectedClientId,
      projectSize: projectInfo.size,
      clientEmail: clientInfo.email
    });

    // Step 1: Handle client
    const clientId = selectedClientId || await findOrCreateClient(clientInfo, agentId);
    
    // Step 2: Calculate system values
    const systemSizeKWp = normalizeToKWp(projectInfo.size) || 0;
    const annualEnergy = calculateAnnualEnergy(systemSizeKWp);
    const carbonCredits = calculateCarbonCredits(systemSizeKWp);
    
    // Step 3: Get portfolio sizes
    const [clientPortfolioKWp, agentPortfolioKWp] = await Promise.all([
      getPortfolioSize(supabase.from('proposals').select('system_size_kwp').eq('client_id', clientId).not('system_size_kwp', 'is', null)),
      getPortfolioSize(supabase.from('proposals').select('system_size_kwp').eq('agent_id', agentId).not('system_size_kwp', 'is', null))
    ]);
    
    const totalClientPortfolio = clientPortfolioKWp + systemSizeKWp;
    const totalAgentPortfolio = agentPortfolioKWp + systemSizeKWp;
    
    const clientSharePercentage = calculateClientSharePercentage(totalClientPortfolio);
    const agentCommissionPercentage = calculateAgentCommissionPercentage(totalAgentPortfolio);
    
    // Step 4: Insert proposal
    const proposalData: ProposalInsert = {
      title: proposalTitle,
      agent_id: agentId,
      client_reference_id: clientId,
      status: 'pending',
      content: {
        title: proposalTitle,
        eligibilityCriteria,
        projectInfo,
        clientInfo
      } as any,
      eligibility_criteria: eligibilityCriteria as any,
      project_info: projectInfo as any,
      system_size_kwp: systemSizeKWp,
      annual_energy: annualEnergy,
      carbon_credits: carbonCredits,
      client_share_percentage: clientSharePercentage,
      agent_commission_percentage: agentCommissionPercentage,
      agent_portfolio_kwp: totalAgentPortfolio
    };

    const { data: insertedProposal, error: insertError } = await supabase
      .from('proposals')
      .insert(proposalData)
      .select('id')
      .single();

    if (insertError) {
      proposalLogger.error("Failed to insert proposal", { error: insertError });
      throw insertError;
    }

    proposalLogger.info("Proposal created successfully", { 
      proposalId: insertedProposal.id,
      clientId,
      systemSizeKWp,
      clientSharePercentage,
      agentCommissionPercentage
    });

    return {
      success: true,
      proposalId: insertedProposal.id
    };

  } catch (error) {
    proposalLogger.error("Proposal creation failed", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create proposal"
    };
  }
}

/**
 * Simple client search
 */
export async function searchClients(searchTerm: string): Promise<Array<{
  id: string;
  name: string;
  email: string;
  company?: string;
  isRegistered: boolean;
}>> {
  const { data, error } = await supabase
    .from('clients')
    .select('id, first_name, last_name, email, company_name, user_id')
    .or(`email.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%`)
    .limit(10);

  if (error) {
    console.error("Client search error:", error);
    return [];
  }

  return data?.map(client => ({
    id: client.id,
    name: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
    email: client.email,
    company: client.company_name || undefined,
    isRegistered: client.user_id !== null
  })) || [];
}

export type { ProposalInsert };
