
import { supabase } from '@/integrations/supabase/client';
import { CacheManager } from '../cache/CacheManager';

export interface ClientListItem {
  id: string;
  name: string;
  email: string;
  company_name?: string;
  project_count: number;
  total_kwp: number;
  is_registered: boolean;
  created_at: string;
}

/**
 * Client data operations with proper foreign key handling
 */
export class ClientDataService {
  static async getClients(userId: string, userRole: string, forceRefresh = false): Promise<ClientListItem[]> {
    const cacheKey = CacheManager.getCacheKey('clients', userId, userRole);
    
    if (!forceRefresh) {
      const cached = CacheManager.getFromCache<ClientListItem[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      // Use the database function that handles the complex joins properly
      const { data, error } = await supabase.rpc('get_agent_clients', {
        agent_id_param: userRole === 'admin' ? null : userId
      });

      if (error) throw error;

      // Transform the data to match ClientListItem type
      const clients: ClientListItem[] = (data || []).map(client => ({
        id: client.client_id,
        name: client.client_name || 'Unknown Client',
        email: client.client_email,
        company_name: client.company_name,
        project_count: client.project_count || 0,
        total_kwp: (client.total_mwp || 0) * 1000, // Convert MWp back to kWp
        is_registered: client.is_registered || false,
        created_at: new Date().toISOString() // Placeholder since not returned by function
      }));

      CacheManager.setCache(cacheKey, clients);
      return clients;
    } catch (error) {
      console.error('Error fetching clients:', error);
      return [];
    }
  }

  static async createClient(clientData: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    company_name?: string;
    notes?: string;
    created_by: string;
  }): Promise<{ success: boolean; client?: any; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([clientData])
        .select()
        .single();

      if (error) throw error;

      // Clear cache to force refresh
      CacheManager.clearCachePattern('clients');

      return { success: true, client: data };
    } catch (error: any) {
      console.error('Error creating client:', error);
      return { success: false, error: error.message };
    }
  }
}
