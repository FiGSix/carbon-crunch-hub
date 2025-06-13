
import { supabase } from '@/integrations/supabase/client';

/**
 * Client search operations
 */
export class ClientSearchService {
  static async searchClients(searchTerm: string): Promise<Array<{
    id: string;
    name: string;
    email: string;
    company?: string;
    isRegistered: boolean;
  }>> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email, company_name, user_id')
        .or(`email.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;

      return data?.map(client => ({
        id: client.id,
        name: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
        email: client.email,
        company: client.company_name || undefined,
        isRegistered: client.user_id !== null
      })) || [];
    } catch (error) {
      console.error('Client search error:', error);
      return [];
    }
  }
}
