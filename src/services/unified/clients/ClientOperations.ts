
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
    console.log('=== ClientOperations.getClients ===');
    console.log('Params:', { userId, userRole, forceRefresh, limit, offset });
    
    if (!RoleValidator.canManageClients(userRole)) {
      console.log('Role validation failed - user cannot manage clients');
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
    
    console.log('Role validation passed - user can manage clients');

    const cacheKey = `unified_clients_paginated_${userId}_${userRole}_${limit}_${offset}`;
    
    if (!forceRefresh) {
      const cached = CacheManager.getFromCache<PaginatedClientsResult>(cacheKey);
      if (cached) return cached;
    }

    try {
      console.log('=== Database Operations ===');
      
      // Debug current session state before making database calls
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Current session state:', {
        hasSession: !!session,
        sessionValid: session ? (new Date(session.expires_at * 1000) > new Date()) : false,
        sessionError: sessionError?.message,
        userId: session?.user?.id
      });

      // Test auth.uid() function directly
      const { data: authTest, error: authTestError } = await supabase.rpc('auth_user_id');
      console.log('auth.uid() test result:', { authTest, authTestError });

      if (authTestError || !authTest) {
        console.error('❌ auth.uid() is returning null - authentication not properly synchronized');
        
        // Try to refresh session to fix auth.uid() issue
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        console.log('Session refresh attempt:', { refreshData: !!refreshData.session, refreshError });
        
        if (refreshError) {
          throw new Error('Authentication session invalid. Please sign out and sign in again.');
        }
      }
      
      // Get total count efficiently using the new function
      const { data: countData, error: countError } = await supabase.rpc('get_agent_clients_count', {
        agent_id_param: userRole === 'admin' ? null : userId
      });

      console.log('Count RPC result:', { countData, countError });

      if (countError) {
        console.error('Count error:', countError);
        throw countError;
      }

      const totalCount = countData || 0;
      console.log('Total count:', totalCount);

      // Get paginated data using the new optimized function
      const { data, error } = await supabase.rpc('get_agent_clients_paginated', {
        agent_id_param: userRole === 'admin' ? null : userId,
        limit_param: limit,
        offset_param: offset
      });

      console.log('Paginated RPC result:', { data, error });
      console.log('Data array length:', data?.length);
      console.log('Sample data item:', data?.[0]);

      if (error) {
        console.error('Paginated data error:', error);
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

      const clients: UnifiedClient[] = (data || []).map(client => {
        console.log('Mapping client:', client);
        return {
          id: client.client_id,
          name: client.client_name || 'Unknown Client',
          email: client.client_email,
          company: client.company_name,
          isRegistered: client.is_registered || false,
          projectCount: client.project_count || 0,
          totalKwp: (client.total_mwp || 0) * 1000, // Convert MWp to kWp
          createdAt: client.created_at || new Date().toISOString()
        };
      });

      console.log('=== Final mapped clients ===');
      console.log('Mapped clients:', clients);
      console.log('Mapped clients count:', clients.length);

      const hasMore = offset + limit < totalCount;
      const nextOffset = hasMore ? offset + limit : totalCount;

      const result: PaginatedClientsResult = {
        clients,
        hasMore,
        totalCount,
        nextOffset
      };

      console.log('=== Final result ===');
      console.log('Result:', result);

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
