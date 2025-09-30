import { supabase } from '@/integrations/supabase/client';
import type { ClientSearchResult } from './types';
import type { Database } from '@/integrations/supabase/types';
import { devLogger } from '@/lib/performance/ConsoleReplacementUtility';

type ClientRow = Database['public']['Tables']['clients']['Row'];

export class ClientSearch {
  /**
   * Search for clients across both registered users and contacts
   */
  static async searchClients(searchTerm: string): Promise<ClientSearchResult[]> {
    try {
      const { data, error } = await supabase.rpc('search_clients', {
        search_term: searchTerm
      });

      if (error) {
        devLogger.clients.error('Error searching clients:', error);
        return [];
      }

      return (data || []).map(client => ({
        id: client.id,
        name: client.name,
        email: client.email,
        company: client.company,
        isRegistered: client.is_registered
      }));
    } catch (error) {
      devLogger.clients.error('Error in client search:', error);
      return [];
    }
  }

  /**
   * Search clients directly from clients table
   */
  static async searchClientsTable(searchTerm: string): Promise<ClientSearchResult[]> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email, company_name, user_id')
        .or(`email.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) {
        devLogger.clients.error('Error searching clients table:', error);
        return [];
      }

      return (data || []).map((client: ClientRow) => ({
        id: client.id,
        name: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
        email: client.email,
        company: client.company_name || undefined,
        isRegistered: client.user_id !== null
      }));
    } catch (error) {
      devLogger.clients.error('Error in client search:', error);
      return [];
    }
  }
}
