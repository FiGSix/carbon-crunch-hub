import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/contexts/auth/types';
import { CacheManager } from '../../cache/CacheManager';
import { RoleValidator } from '../../utils/RoleValidator';
import { ErrorHandler } from '../../utils/ErrorHandler';
import type { UnifiedClient, PaginatedClientsResult } from '../types';
import { devLogger } from '@/lib/performance/ConsoleReplacementUtility';
import { withTimeout } from '../../utils/withTimeout';

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
      console.info('🚀 ClientFetcher: Starting fetch', { userRole, limit, offset });
      
      // Build RPC calls with correct params (avoid null for admin)
      const countCall = userRole === 'admin'
        ? supabase.rpc('get_agent_clients_count', {})
        : supabase.rpc('get_agent_clients_count', { agent_id_param: userId });

      const dataCall = userRole === 'admin'
        ? supabase.rpc('get_agent_clients_paginated_admin', { 
            limit_param: limit, 
            offset_param: offset 
          })
        : supabase.rpc('get_agent_clients_paginated', { 
            agent_id_param: userId,
            limit_param: limit,
            offset_param: offset
          });

      // Wrap with timeout to prevent hanging
      const [countResult, dataResult] = await withTimeout(
        Promise.allSettled([countCall, dataCall]),
        12000
      );

      console.info('✅ RPC calls completed', { 
        countStatus: countResult.status, 
        dataStatus: dataResult.status 
      });

      // Extract count (non-critical)
      let totalCount = 0;
      if (countResult.status === 'fulfilled' && !countResult.value.error) {
        totalCount = countResult.value.data || 0;
      }

      // Extract paginated data (critical)
      let data: any[] | null = null;
      
      if (dataResult.status === 'fulfilled' && !dataResult.value.error) {
        data = dataResult.value.data;
      } else {
        // RPC failed - use fallback query
        console.info('⚠️ RPC failed, using fallback query');
        
        try {
          // Query the clients table (not profiles) to match RPC behavior
          let fallbackQueryBuilder = supabase
            .from('clients')
            .select(`
              id,
              first_name,
              last_name,
              email,
              company_name,
              user_id,
              created_at,
              created_by
            `)
            .not('email', 'is', null)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

          // For agents, filter by their created clients
          if (userRole !== 'admin') {
            fallbackQueryBuilder = fallbackQueryBuilder.eq('created_by', userId);
          }

          // Execute query with timeout
          const fallbackResult = await Promise.race([
            fallbackQueryBuilder,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Fallback query timed out')), 8000)
            )
          ]) as Awaited<typeof fallbackQueryBuilder>;
          
          if (fallbackResult.error) throw fallbackResult.error;
          
          console.info('✅ Fallback query succeeded', { count: fallbackResult.data?.length });
          
          // Map fallback data to expected format
          data = (fallbackResult.data || []).map(row => ({
            client_id: row.id,
            client_name: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || row.company_name || 'Unknown',
            client_email: row.email,
            company_name: row.company_name || '',
            is_registered: row.user_id !== null,
            project_count: 0,
            total_mwp: 0,
            created_at: row.created_at,
            agent_id: row.created_by || null,
            is_active: true
          }));
          
          if (totalCount === 0) {
            totalCount = data.length;
          }
        } catch (fallbackError) {
          console.error('❌ Fallback query also failed:', fallbackError);
          return {
            clients: [],
            hasMore: false,
            totalCount: 0,
            nextOffset: 0
          };
        }
      }

      if (!data) {
        return {
          clients: [],
          hasMore: false,
          totalCount: 0,
          nextOffset: 0
        };
      }

      console.info('📊 Processing client data', { count: data.length });

      const clients: UnifiedClient[] = data.map(client => ({
        id: client.client_id,
        name: client.client_name || 'Unknown Client',
        email: client.client_email,
        company: client.company_name,
        isRegistered: client.is_registered || false,
        projectCount: client.project_count || 0,
        totalKwp: (client.total_mwp || 0) * 1000,
        createdAt: client.created_at || new Date().toISOString(),
        agentCompanyName: (client as any).agent_company_name,
        agentId: (client as any).agent_id,
        isActive: (client as any).is_active || false
      }));

      const hasMore = totalCount > 0 ? offset + limit < totalCount : clients.length >= limit;
      const nextOffset = hasMore ? offset + limit : (totalCount > 0 ? totalCount : offset + clients.length);

      const result: PaginatedClientsResult = {
        clients,
        hasMore,
        totalCount,
        nextOffset
      };

      console.info('🏁 Fetch complete', { clientCount: clients.length, hasMore });

      CacheManager.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('❌ ClientFetcher error:', error);
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