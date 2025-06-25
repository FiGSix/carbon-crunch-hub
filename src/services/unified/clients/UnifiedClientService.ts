
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/contexts/auth/types';
import { CacheManager } from '../cache/CacheManager';
import { RoleValidator } from '../utils/RoleValidator';
import { ErrorHandler } from '../utils/ErrorHandler';

export interface UnifiedClient {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  isRegistered: boolean;
  userId?: string;
  projectCount: number;
  totalKwp: number;
  createdAt: string;
  createdBy?: string;
}

export interface ClientSearchResult {
  id: string;
  name: string;
  email: string;
  company?: string;
  isRegistered: boolean;
}

/**
 * Unified client service that consolidates registered users and contact clients
 * This is the single source of truth for all client operations
 */
export class UnifiedClientService {
  /**
   * Get all clients for an agent (unified view of registered users and contacts)
   */
  static async getClients(userId: string, userRole: UserRole, forceRefresh = false): Promise<UnifiedClient[]> {
    if (!RoleValidator.canManageClients(userRole)) {
      ErrorHandler.logSecurityEvent({
        type: 'unauthorized_access',
        userId,
        resource: 'clients',
        action: 'list'
      });
      return [];
    }

    const cacheKey = CacheManager.getCacheKey('unified_clients', userId, userRole);
    
    if (!forceRefresh) {
      const cached = CacheManager.getFromCache<UnifiedClient[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      // Use the database function that provides unified client data
      const { data, error } = await supabase.rpc('get_agent_clients', {
        agent_id_param: userRole === 'admin' ? null : userId
      });

      if (error) {
        const errorResult = ErrorHandler.handleRLSError(error, 'unified clients fetch');
        if (errorResult.requiresReauth) {
          window.dispatchEvent(new CustomEvent('auth-required'));
        }
        return [];
      }

      const clients: UnifiedClient[] = (data || []).map(client => ({
        id: client.client_id,
        name: client.client_name || 'Unknown Client',
        email: client.client_email,
        company: client.company_name,
        isRegistered: client.is_registered || false,
        projectCount: client.project_count || 0,
        totalKwp: (client.total_mwp || 0) * 1000, // Convert MWp to kWp
        createdAt: client.created_at || new Date().toISOString()
      }));

      CacheManager.setCache(cacheKey, clients);
      return clients;
    } catch (error) {
      console.error('Error fetching unified clients:', error);
      ErrorHandler.logSecurityEvent({
        type: 'access_denied',
        userId,
        resource: 'unified_clients',
        action: 'list',
        details: error
      });
      return [];
    }
  }

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

  /**
   * Create a new client contact (unified approach)
   */
  static async createClient(clientData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    companyName?: string;
    notes?: string;
    createdBy: string;
  }): Promise<{ success: boolean; client?: any; error?: string }> {
    try {
      // Use the edge function for client creation to ensure proper validation
      const { data, error } = await supabase.functions.invoke('manage-client-profile', {
        body: {
          email: clientData.email,
          firstName: clientData.firstName,
          lastName: clientData.lastName,
          phone: clientData.phone,
          companyName: clientData.companyName,
          existingClient: false
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.success) {
        return { success: false, error: data.error };
      }

      // Clear cache to force refresh
      CacheManager.clearCachePattern('unified_clients');

      return { success: true, client: { id: data.clientId } };
    } catch (error: any) {
      console.error('Error creating unified client:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear all client-related cache
   */
  static clearCache(): void {
    CacheManager.clearCachePattern('unified_clients');
    CacheManager.clearCachePattern('clients');
  }
}
