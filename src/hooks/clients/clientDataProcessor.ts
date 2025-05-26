
import { supabase } from '@/integrations/supabase/client';
import { ClientData } from './types';

export async function fetchClientsData(userRole: string, userId?: string): Promise<ClientData[]> {
  console.log('=== fetchClientsData: Starting fetch ===');
  console.log('User:', userId);
  console.log('User Role:', userRole);

  if (!userId) {
    console.log('No user ID provided');
    throw new Error('User not authenticated');
  }

  // Build query similar to proposals
  let query = supabase
    .from('proposals')
    .select(`
      id,
      content,
      client_id,
      client_reference_id,
      agent_id,
      annual_energy
    `);

  console.log('User role check:', userRole);

  // Apply role-based filtering
  if (userRole === 'admin') {
    console.log('Admin user - fetching all proposals');
    // Admin sees all proposals
  } else if (userRole === 'agent' && userId) {
    console.log('Agent user - filtering by agent_id:', userId);
    query = query.eq('agent_id', userId);
  } else {
    console.log('Other role or no user ID - returning empty data');
    return [];
  }

  console.log('Executing query...');
  const { data: proposalsData, error: queryError } = await query;

  if (queryError) {
    console.error('Query error:', queryError);
    throw queryError;
  }

  console.log('Query successful. Proposals count:', proposalsData?.length || 0);

  if (!proposalsData || proposalsData.length === 0) {
    console.log('No proposals found - returning empty array');
    return [];
  }

  return processProposalsIntoClients(proposalsData);
}

function processProposalsIntoClients(proposalsData: any[]): ClientData[] {
  console.log('Processing client data...');
  const clientMap = new Map<string, ClientData>();

  proposalsData.forEach((proposal, index) => {
    console.log(`Processing proposal ${index + 1}:`, proposal.id);
    
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
        console.log(`Client info from content: ${clientName} (${clientEmail})`);
      }
    } catch (error) {
      console.warn(`Error parsing proposal ${proposal.id} content:`, error);
    }

    // Use email as fallback ID if no client_id
    if (!clientId && clientEmail) {
      clientId = clientEmail;
      console.log(`Using email as client ID: ${clientEmail}`);
    }

    if (!clientId) {
      console.warn(`No client identifier found for proposal ${proposal.id} - skipping`);
      return;
    }

    const existingClient = clientMap.get(clientId);
    const annualEnergy = proposal.annual_energy || 0;

    if (existingClient) {
      console.log(`Updating existing client: ${clientId}`);
      existingClient.project_count += 1;
      existingClient.total_mwp += annualEnergy / 1000; // Convert kW to MW
    } else {
      console.log(`Creating new client: ${clientId} (${clientName})`);
      clientMap.set(clientId, {
        client_id: clientId,
        client_name: clientName,
        client_email: clientEmail,
        company_name: companyName,
        total_mwp: annualEnergy / 1000, // Convert kW to MW
        project_count: 1
      });
    }
  });

  const clientsArray = Array.from(clientMap.values())
    .filter(client => {
      const isValid = client.client_name !== 'Unknown Client';
      if (!isValid) {
        console.log(`Filtering out client with unknown name: ${client.client_id}`);
      }
      return isValid;
    })
    .sort((a, b) => a.client_name.localeCompare(b.client_name));

  console.log('=== Final client data ===');
  console.log('Unique clients found:', clientsArray.length);

  return clientsArray;
}
