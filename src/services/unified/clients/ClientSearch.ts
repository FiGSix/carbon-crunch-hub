
import { supabase } from '@/integrations/supabase/client';
import type { ClientSearchResult } from './types';

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
        console.error('Error searching clients:', error);
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
      console.error('Error in client search:', error);
      return [];
    }
  }
}
