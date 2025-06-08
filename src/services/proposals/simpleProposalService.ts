
import { supabase } from "@/integrations/supabase/client";
import { EligibilityCriteria, ClientInformation, ProjectInformation } from "@/types/proposals";
import { logger } from "@/lib/logger";
import { normalizeToKWp } from "@/lib/calculations/carbon/normalization";
import { calculateAnnualEnergy, calculateCarbonCredits } from "@/lib/calculations/carbon";

interface SimpleProposalData {
  title: string;
  agent_id: string;
  content: {
    eligibilityCriteria: EligibilityCriteria;
    projectInfo: ProjectInformation;
    clientInfo: ClientInformation;
  };
  system_size_kwp: number;
  annual_energy: number;
  carbon_credits: number;
  client_share_percentage: number;
  agent_commission_percentage: number;
  status: string;
  created_at: string;
}

/**
 * Simplified client management - find or create client in one step
 */
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

/**
 * Calculate client share percentage based on simple portfolio rules
 */
function calculateClientSharePercentage(portfolioKWp: number): number {
  if (portfolioKWp < 5000) return 63;
  if (portfolioKWp < 10000) return 66.5;
  if (portfolioKWp < 20000) return 67.9;
  if (portfolioKWp < 30000) return 70;
  return 73.5;
}

/**
 * Calculate agent commission percentage based on simple portfolio rules
 */
function calculateAgentCommissionPercentage(portfolioKWp: number): number {
  return portfolioKWp < 15000 ? 4 : 7;
}

/**
 * Get client's current portfolio size
 */
async function getClientPortfolioSize(clientId: string): Promise<number> {
  const { data } = await supabase
    .from('proposals')
    .select('system_size_kwp')
    .eq('client_reference_id', clientId)
    .not('system_size_kwp', 'is', null);
  
  return data?.reduce((total, p) => total + (p.system_size_kwp || 0), 0) || 0;
}

/**
 * Get agent's current portfolio size
 */
async function getAgentPortfolioSize(agentId: string): Promise<number> {
  const { data } = await supabase
    .from('proposals')
    .select('system_size_kwp')
    .eq('agent_id', agentId)
    .not('system_size_kwp', 'is', null);
  
  return data?.reduce((total, p) => total + (p.system_size_kwp || 0), 0) || 0;
}

/**
 * Simplified proposal creation - everything in one function
 */
export async function createSimpleProposal(
  title: string,
  agentId: string,
  eligibilityCriteria: EligibilityCriteria,
  projectInfo: ProjectInformation,
  clientInfo: ClientInformation,
  selectedClientId?: string
): Promise<{ success: boolean; proposalId?: string; error?: string }> {
  const proposalLogger = logger.withContext({
    component: 'SimpleProposalService',
    method: 'createSimpleProposal'
  });

  try {
    proposalLogger.info("Creating proposal with simplified service", { 
      title, 
      agentId, 
      selectedClientId,
      projectSize: projectInfo.size,
      clientEmail: clientInfo.email
    });

    // Step 1: Handle client (find existing or create new)
    const clientId = selectedClientId || await findOrCreateClient(clientInfo, agentId);
    
    // Step 2: Calculate system size and carbon values
    const systemSizeKWp = normalizeToKWp(projectInfo.size) || 0;
    const annualEnergy = calculateAnnualEnergy(systemSizeKWp);
    const carbonCredits = calculateCarbonCredits(systemSizeKWp);
    
    // Step 3: Calculate portfolio-based percentages
    const [clientPortfolioKWp, agentPortfolioKWp] = await Promise.all([
      getClientPortfolioSize(clientId),
      getAgentPortfolioSize(agentId)
    ]);
    
    const totalClientPortfolio = clientPortfolioKWp + systemSizeKWp;
    const totalAgentPortfolio = agentPortfolioKWp + systemSizeKWp;
    
    const clientSharePercentage = calculateClientSharePercentage(totalClientPortfolio);
    const agentCommissionPercentage = calculateAgentCommissionPercentage(totalAgentPortfolio);
    
    // Step 4: Build proposal data
    const proposalData: SimpleProposalData = {
      title,
      agent_id: agentId,
      content: {
        eligibilityCriteria,
        projectInfo,
        clientInfo
      },
      system_size_kwp: systemSizeKWp,
      annual_energy: annualEnergy,
      carbon_credits: carbonCredits,
      client_share_percentage: clientSharePercentage,
      agent_commission_percentage: agentCommissionPercentage,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    // Step 5: Insert proposal
    const { data: insertedProposal, error: insertError } = await supabase
      .from('proposals')
      .insert({
        ...proposalData,
        client_reference_id: clientId,
        eligibility_criteria: eligibilityCriteria,
        project_info: projectInfo
      })
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
      annualEnergy,
      carbonCredits,
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
 * Simple client search - just search the unified clients table
 */
export async function searchSimpleClients(searchTerm: string): Promise<Array<{
  id: string;
  name: string;
  email: string;
  company?: string;
}>> {
  const { data, error } = await supabase
    .from('clients')
    .select('id, first_name, last_name, email, company_name')
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
    company: client.company_name || undefined
  })) || [];
}
