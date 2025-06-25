
import { supabase } from '@/integrations/supabase/client';
import { CacheManager } from '../cache/CacheManager';
import { RoleValidator } from '../utils/RoleValidator';
import { ErrorHandler } from '../utils/ErrorHandler';
import { UserRole } from '@/contexts/auth/types';
import type { Database } from '@/integrations/supabase/types';

type ClientRow = Database['public']['Tables']['clients']['Row'];
type ClientInsert = Database['public']['Tables']['clients']['Insert'];

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
 * Client data operations with enhanced security validation
 */
export class ClientDataService {
  static async getClients(userId: string, userRole: UserRole, forceRefresh = false): Promise<ClientListItem[]> {
    // Validate user can access clients
    if (!RoleValidator.canManageClients(userRole)) {
      ErrorHandler.logSecurityEvent({
        type: 'unauthorized_access',
        userId,
        resource: 'clients',
        action: 'list'
      });
      return [];
    }

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

      if (error) {
        const errorResult = ErrorHandler.handleRLSError(error, 'clients fetch');
        if (errorResult.requiresReauth) {
          window.dispatchEvent(new CustomEvent('auth-required'));
        }
        return [];
      }

      // Transform the data to match ClientListItem type
      const clients: ClientListItem[] = (data || []).map(client => ({
        id: client.client_id,
        name: client.client_name || 'Unknown Client',
        email: client.client_email,
        company_name: client.company_name,
        project_count: client.project_count || 0,
        total_kwp: (client.total_mwp || 0) * 1000, // Convert MWp back to kWp
        is_registered: client.is_registered || false,
        created_at: client.created_at || new Date().toISOString()
      }));

      CacheManager.setCache(cacheKey, clients);
      return clients;
    } catch (error) {
      console.error('Error fetching clients:', error);
      ErrorHandler.logSecurityEvent({
        type: 'access_denied',
        userId,
        resource: 'clients',
        action: 'list',
        details: error
      });
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
  }): Promise<{ success: boolean; client?: ClientRow; error?: string }> {
    try {
      const insertData: ClientInsert = {
        first_name: clientData.first_name,
        last_name: clientData.last_name,
        email: clientData.email,
        phone: clientData.phone,
        company_name: clientData.company_name,
        notes: clientData.notes,
        created_by: clientData.created_by
      };

      const { data, error } = await supabase
        .from('clients')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        const errorResult = ErrorHandler.handleRLSError(error, 'client creation');
        if (errorResult.requiresReauth) {
          window.dispatchEvent(new CustomEvent('auth-required'));
        }
        return { success: false, error: errorResult.message };
      }

      // Clear cache to force refresh
      CacheManager.clearCachePattern('clients');

      return { success: true, client: data };
    } catch (error: any) {
      console.error('Error creating client:', error);
      ErrorHandler.logSecurityEvent({
        type: 'access_denied',
        userId: clientData.created_by,
        resource: 'clients',
        action: 'create',
        details: error
      });
      return { success: false, error: error.message };
    }
  }
}
