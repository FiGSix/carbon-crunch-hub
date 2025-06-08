
import { supabase } from "@/integrations/supabase/client";
import { ClientInformation } from "@/types/proposals";

/**
 * Simplified client management - find or create client in one step
 */
export async function findOrCreateClient(clientInfo: ClientInformation, agentId: string): Promise<string> {
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
 * Simple client search - just search the unified clients table
 */
export async function searchSimpleClients(searchTerm: string): Promise<Array<{
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
