
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/contexts/auth/types';
import { CacheManager } from '../cache/CacheManager';
import { RoleValidator } from '../utils/RoleValidator';
import { ErrorHandler } from '../utils/ErrorHandler';
import type { UnifiedClient, PaginatedClientsResult, CreateClientData } from './types';
import type { Database } from '@/integrations/supabase/types';

type ClientRow = Database['public']['Tables']['clients']['Row'];
type ClientInsert = Database['public']['Tables']['clients']['Insert'];

export class ClientOperations {
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

    const cacheKey = `unified_clients_paginated_${userId}_${userRole}_${limit}_${offset}`;
    
    if (!forceRefresh) {
      const cached = CacheManager.getFromCache<PaginatedClientsResult>(cacheKey);
      if (cached) return cached;
    }

    try {
      // First get the total count - fix the query to get count properly
      const { data: countData, error: countError } = await supabase.rpc('get_agent_clients_optimized', {
        agent_id_param: userRole === 'admin' ? null : userId
      });

      if (countError) {
        throw countError;
      }

      const totalCount = countData?.length || 0;

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
   * Create a new client contact (unified approach)
   */
  static async createClient(clientData: CreateClientData): Promise<{ success: boolean; client?: ClientRow; error?: string }> {
    try {
      // Map CreateClientData to ClientInsert
      const insertData: ClientInsert = {
        first_name: clientData.firstName,
        last_name: clientData.lastName,
        email: clientData.email,
        phone: clientData.phone,
        company_name: clientData.companyName,
        notes: clientData.notes,
        created_by: clientData.createdBy
      };

      const { data, error } = await supabase
        .from('clients')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Clear cache to force refresh
      CacheManager.clearCachePattern('unified_clients');

      return { success: true, client: data };
    } catch (error: any) {
      console.error('Error creating unified client:', error);
      return { success: false, error: error.message };
    }
  }
}
