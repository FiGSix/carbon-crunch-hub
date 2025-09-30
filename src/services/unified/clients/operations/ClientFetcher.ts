import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/contexts/auth/types';
import { CacheManager } from '../../cache/CacheManager';
import { RoleValidator } from '../../utils/RoleValidator';
import { ErrorHandler } from '../../utils/ErrorHandler';
import type { UnifiedClient, PaginatedClientsResult } from '../types';
import { devLogger } from '@/lib/performance/ConsoleReplacementUtility';

/**
 * Handles fetching clients with pagination and role-based access control
 */
export class ClientFetcher {
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
    if (import.meta.env.DEV) {
      devLogger.clients.debug('=== ClientFetcher.getClients ===');
      devLogger.clients.debug('Params:', { userId, userRole, forceRefresh, limit, offset });
    }
    
    if (!RoleValidator.canManageClients(userRole)) {
      if (import.meta.env.DEV) {
        devLogger.clients.warn('Role validation failed - user cannot manage clients');
      }
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
    
    if (import.meta.env.DEV) {
      devLogger.clients.debug('Role validation passed - user can manage clients');
    }

    const cacheKey = `unified_clients_paginated_${userId}_${userRole}_${limit}_${offset}`;
    
    if (!forceRefresh) {
      const cached = CacheManager.getFromCache<PaginatedClientsResult>(cacheKey);
      if (cached) return cached;
    }

    try {
      if (import.meta.env.DEV) {
        devLogger.clients.debug('=== Database Operations ===');
        
        // Debug current session state before making database calls
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        devLogger.clients.debug('Current session state:', {
          hasSession: !!session,
          sessionValid: session ? (new Date(session.expires_at * 1000) > new Date()) : false,
          sessionError: sessionError?.message,
          userId: session?.user?.id
        });

        // Test auth.uid() function directly
        const { data: authTest, error: authTestError } = await supabase.rpc('auth_user_id');
        devLogger.clients.debug('auth.uid() test result:', { authTest, authTestError });

        if (authTestError || !authTest) {
          devLogger.clients.error('❌ auth.uid() is returning null - authentication not properly synchronized');
        }
      }

      // Check for auth issues and handle gracefully
      const { data: authTest, error: authTestError } = await supabase.rpc('auth_user_id');
      if (authTestError || !authTest) {
        // Try to refresh session to fix auth.uid() issue
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          throw new Error('Authentication session invalid. Please sign out and sign in again.');
        }
      }
      
      // Get total count efficiently using the new function
      const { data: countData, error: countError } = await supabase.rpc('get_agent_clients_count', {
        agent_id_param: userRole === 'admin' ? null : userId
      });

      if (import.meta.env.DEV) {
        devLogger.clients.debug('Count RPC result:', { countData, countError });
      }

      if (countError) {
        if (import.meta.env.DEV) {
          devLogger.clients.error('Count error:', countError);
        }
        throw countError;
      }

      const totalCount = countData || 0;
      
      if (import.meta.env.DEV) {
        devLogger.clients.debug('Total count:', totalCount);
      }

      // Get paginated data using the new optimized function
      const { data, error } = await supabase.rpc('get_agent_clients_paginated', {
        agent_id_param: userRole === 'admin' ? null : userId,
        limit_param: limit,
        offset_param: offset
      });

      if (import.meta.env.DEV) {
        devLogger.clients.debug('Paginated RPC result:', { data, error });
        devLogger.clients.debug('Data array length:', data?.length);
        devLogger.clients.debug('Sample data item:', data?.[0]);
      }

      if (error) {
        if (import.meta.env.DEV) {
          devLogger.clients.error('Paginated data error:', error);
        }
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
        if (import.meta.env.DEV) {
          devLogger.clients.debug('Mapping client:', client);
        }
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

      if (import.meta.env.DEV) {
        devLogger.clients.debug('=== Final mapped clients ===');
        devLogger.clients.debug('Mapped clients:', clients);
        devLogger.clients.debug('Mapped clients count:', clients.length);
      }

      const hasMore = offset + limit < totalCount;
      const nextOffset = hasMore ? offset + limit : totalCount;

      const result: PaginatedClientsResult = {
        clients,
        hasMore,
        totalCount,
        nextOffset
      };

      if (import.meta.env.DEV) {
        devLogger.clients.debug('=== Final result ===');
        devLogger.clients.debug('Result:', result);
      }

      CacheManager.setCache(cacheKey, result);
      return result;
    } catch (error) {
      devLogger.clients.error('Error fetching unified clients:', error);
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
}