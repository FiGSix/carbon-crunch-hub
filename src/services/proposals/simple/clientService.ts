
import { supabase } from '@/lib/supabase';

export interface ClientSearchResult {
  id: string;
  name: string;
  email: string;
  company?: string;
}

export async function searchClientsByName(searchTerm: string): Promise<ClientSearchResult[]> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email, company_name')
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .limit(10);

    if (error) throw error;

    return data?.map(client => ({
      id: client.id,
      name: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
      email: client.email,
      company: client.company_name
    })) || [];
  } catch (error) {
    console.error('Error searching clients:', error);
    return [];
  }
}

// Add the missing searchSimpleClients function
export async function searchSimpleClients(searchTerm: string): Promise<ClientSearchResult[]> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email, company_name')
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .limit(10);

    if (error) throw error;

    return data?.map(client => ({
      id: client.id,
      name: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
      email: client.email,
      company: client.company_name,
      isRegistered: false // Simple clients are not registered by default
    })) || [];
  } catch (error) {
    console.error('Error searching simple clients:', error);
    return [];
  }
}
