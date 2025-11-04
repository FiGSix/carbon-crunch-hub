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
      }
      
      // Parallelize count and paginated data RPCs for faster loading
      const rpcFunction = userRole === 'admin' 
        ? 'get_agent_clients_paginated_admin' 
        : 'get_agent_clients_paginated';

      const [countResult, dataResult] = await Promise.allSettled([
        supabase.rpc('get_agent_clients_count', {
          agent_id_param: userRole === 'admin' ? null : userId
        }),
        supabase.rpc(rpcFunction, {
          agent_id_param: userRole === 'admin' ? null : userId,
          limit_param: limit,
          offset_param: offset
        })
      ]);

      if (import.meta.env.DEV) {
        devLogger.clients.debug('Parallel RPC results:', { countResult, dataResult });
      }

      // Extract count (non-critical - we can estimate if it fails)
      let totalCount = 0;
      if (countResult.status === 'fulfilled' && !countResult.value.error) {
        totalCount = countResult.value.data || 0;
      } else if (import.meta.env.DEV) {
        devLogger.clients.warn('Count RPC failed, will estimate from data');
      }

      // Extract paginated data (critical)
      if (dataResult.status === 'rejected' || (dataResult.status === 'fulfilled' && dataResult.value.error)) {
        const error = dataResult.status === 'rejected' ? dataResult.reason : dataResult.value.error;
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

      const data = dataResult.value.data;

      if (import.meta.env.DEV) {
        devLogger.clients.debug('Data array length:', data?.length);
        devLogger.clients.debug('Sample data item:', data?.[0]);
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
          createdAt: client.created_at || new Date().toISOString(),
          agentCompanyName: (client as any).agent_company_name,
          agentId: (client as any).agent_id,
          isActive: (client as any).is_active || false
        };
      });

      if (import.meta.env.DEV) {
        devLogger.clients.debug('=== Final mapped clients ===');
        devLogger.clients.debug('Mapped clients:', clients);
        devLogger.clients.debug('Mapped clients count:', clients.length);
      }

      // If count failed, estimate hasMore from data length
      const hasMore = totalCount > 0 ? offset + limit < totalCount : clients.length >= limit;
      const nextOffset = hasMore ? offset + limit : (totalCount > 0 ? totalCount : offset + clients.length);

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