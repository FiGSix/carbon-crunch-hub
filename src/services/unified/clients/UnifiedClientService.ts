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

export interface PaginatedClientsResult {
  clients: UnifiedClient[];
  hasMore: boolean;
  totalCount: number;
  nextOffset: number;
}

/**
 * Unified client service that consolidates registered users and contact clients
 * This is the single source of truth for all client operations
 */
export class UnifiedClientService {
  /**
   * Get all clients for an agent (unified view of registered users and contacts) with pagination
   */
  static async getClients(
    userId: string, 
    userRole: UserRole, 
    forceRefresh = false,
    limit = 20,
    offset = 0
  ): Promise<PaginatedClientsResult> {
    if (!RoleValidator.canManageClients(userRole)) {
      ErrorHandler.logSecurityEvent({
        type: 'unauthorized_access',
        userId,
        resource: 'clients',
        action: 'list'
      });
      return {
        clients: [],
        hasMore: false,
        totalCount: 0,
        nextOffset: 0
      };
    }

    const cacheKey = CacheManager.getCacheKey('unified_clients_paginated', userId, userRole, `${limit}_${offset}`);
    
    if (!forceRefresh) {
      const cached = CacheManager.getFromCache<PaginatedClientsResult>(cacheKey);
      if (cached) return cached;
    }

    try {
      // First get the total count
      const { count, error: countError } = await supabase.rpc('get_agent_clients_optimized', {
        agent_id_param: userRole === 'admin' ? null : userId
      }).select('*', { count: 'exact', head: true });

      if (countError) {
        throw countError;
      }

      const totalCount = count || 0;

      // Then get the paginated data
      const { data, error } = await supabase.rpc('get_agent_clients_optimized', {
        agent_id_param: userRole === 'admin' ? null : userId
      }).range(offset, offset + limit - 1);

      if (error) {
        const errorResult = ErrorHandler.handleRLSError(error, 'unified clients fetch');
        if (errorResult.requiresReauth) {
          window.dispatchEvent(new CustomEvent('auth-required'));
        }
        return {
          clients: [],
          hasMore: false,
          totalCount: 0,
          nextOffset: 0
        };
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

      const hasMore = offset + limit < totalCount;
      const nextOffset = hasMore ? offset + limit : totalCount;

      const result: PaginatedClientsResult = {
        clients,
        hasMore,
        totalCount,
        nextOffset
      };

      CacheManager.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching unified clients:', error);
      ErrorHandler.logSecurityEvent({
        type: 'access_denied',
        userId,
        resource: 'unified_clients',
        action: 'list',
        details: error
      });
      return {
        clients: [],
        hasMore: false,
        totalCount: 0,
        nextOffset: 0
      };
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
