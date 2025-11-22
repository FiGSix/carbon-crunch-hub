
import { supabase } from '@/integrations/supabase/client';
import { ClientData } from './types';
import { devLogger } from '@/lib/performance/ConsoleReplacementUtility';

export async function fetchClientsData(userRole: string, userId?: string): Promise<ClientData[]> {
  devLogger.clients.log('fetchClientsData: Starting fetch', { userId, userRole });

  if (!userId) {
    devLogger.clients.log('No user ID provided');
    throw new Error('User not authenticated');
  }

  // Build query to fetch proposals and join with clients for portfolio override data
  let query = supabase
    .from('proposals')
    .select(`
      id,
      content,
      client_id,
      client_reference_id,
      agent_id,
      annual_energy,
      clients:client_reference_id (
        portfolio_client_share_override,
        portfolio_override_set_at,
        portfolio_override_set_by
      )
    `);

  // Apply role-based filtering
  if (userRole === 'admin') {
    devLogger.clients.log('Admin user - fetching all proposals');
    // Admin sees all proposals
  } else if (userRole === 'agent' && userId) {
    devLogger.clients.log('Agent user - fetching company proposals', { userId });
    
    // Get user's company members to show all team proposals
    const { data: companyMembers } = await supabase
      .from('company_members')
      .select('company_id, user_id')
      .eq('status', 'active');

    // Find user's companies
    const userCompanyIds = companyMembers
      ?.filter(cm => cm.user_id === userId)
      .map(cm => cm.company_id) || [];

    if (userCompanyIds.length > 0) {
      // Get all agent IDs from user's companies
      const teamAgentIds = companyMembers
        ?.filter(cm => userCompanyIds.includes(cm.company_id))
        .map(cm => cm.user_id) || [];

      // Include user's own ID even if not in a company
      const allAgentIds = [...new Set([...teamAgentIds, userId])];
      query = query.in('agent_id', allAgentIds);
    } else {
      // No company membership - show only own proposals
      query = query.eq('agent_id', userId);
    }
  } else {
    devLogger.clients.log('Other role or no user ID - returning empty data');
    return [];
  }

  const { data: proposalsData, error: queryError } = await query;

  if (queryError) {
    devLogger.clients.error('Query error:', queryError);
    throw queryError;
  }

  devLogger.clients.log('Query successful', { proposalsCount: proposalsData?.length || 0 });

  if (!proposalsData || proposalsData.length === 0) {
    devLogger.clients.log('No proposals found - returning empty array');
    return [];
  }

  const result = processProposalsIntoClients(proposalsData);
  devLogger.clients.log('fetchClientsData: Returning clients', { clientCount: result.length });
  return result;
}

function processProposalsIntoClients(proposalsData: any[]): ClientData[] {
  devLogger.clients.log('Processing proposals into client data', { proposalsCount: proposalsData.length });
  const clientMap = new Map<string, ClientData>();

  proposalsData.forEach((proposal, index) => {
    
    let clientId = proposal.client_reference_id || proposal.client_id;
    let clientName = 'Unknown Client';
    let clientEmail = '';
    let companyName = '';

    // Extract client info from proposal content
    try {
      const content = proposal.content as any;
      if (content?.clientInfo) {
        clientName = content.clientInfo.name || clientName;
        clientEmail = content.clientInfo.email || '';
        companyName = content.clientInfo.companyName || '';
      }
    } catch (error) {
      devLogger.clients.warn('Error parsing proposal content', { proposalId: proposal.id, error });
    }

    // Use email as fallback ID if no client_id
    if (!clientId && clientEmail) {
      clientId = clientEmail;
    }

    if (!clientId) {
      devLogger.clients.warn('No client identifier found for proposal - skipping', { proposalId: proposal.id });
      return;
    }

    const existingClient = clientMap.get(clientId);
    const annualEnergy = proposal.annual_energy || 0;

    // Extract portfolio override data from joined clients table
    const portfolioOverride = proposal.clients?.portfolio_client_share_override || null;
    const portfolioOverrideSetAt = proposal.clients?.portfolio_override_set_at || null;
    const portfolioOverrideSetBy = proposal.clients?.portfolio_override_set_by || null;

    if (existingClient) {
      existingClient.project_count += 1;
      existingClient.total_mwp += annualEnergy / 1000; // Convert kW to MW
    } else {
      clientMap.set(clientId, {
        client_id: clientId,
        client_name: clientName,
        client_email: clientEmail,
        company_name: companyName,
        total_mwp: annualEnergy / 1000, // Convert kW to MW
        project_count: 1,
        is_active: false, // Default for legacy processor
        portfolio_client_share_override: portfolioOverride,
        portfolio_override_set_at: portfolioOverrideSetAt,
        portfolio_override_set_by: portfolioOverrideSetBy,
      });
    }
  });

  const clientsArray = Array.from(clientMap.values())
    .filter(client => client.client_name !== 'Unknown Client')
    .sort((a, b) => a.client_name.localeCompare(b.client_name));

  devLogger.clients.log('Final client data processed', { 
    uniqueClients: clientsArray.length,
    clientNames: clientsArray.map(c => c.client_name)
  });

  return clientsArray;
}
