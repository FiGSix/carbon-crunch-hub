import { supabase } from '@/integrations/supabase/client';
import { buildOptimizedProfileQuery, buildOptimizedNotificationQuery } from '@/hooks/proposals/utils/optimizedQueryBuilders';
import { logger } from '@/lib/logger';

/**
 * Phase 5 Optimization: Centralized optimized data service
 * Replaces select('*') patterns with specific field selection
 */
export class OptimizedDataService {
  private static logger = logger.withContext({ 
    component: 'OptimizedDataService', 
    feature: 'query-optimization' 
  });

  /**
   * Optimized profile fetching - replaces select('*')
   */
  static async getProfile(userId: string) {
    this.logger.info('Fetching optimized profile', { userId });
    
    const { data, error } = await buildOptimizedProfileQuery(supabase, userId);
    
    if (error) {
      this.logger.error('Profile fetch failed', { error, userId });
      throw error;
    }
    
    this.logger.info('Profile fetched successfully', { userId });
    return data;
  }

  /**
   * Optimized notifications fetching with proper indexing
   */
  static async getNotifications(userId: string, limit = 10, unreadOnly = false) {
    this.logger.info('Fetching optimized notifications', { userId, limit, unreadOnly });
    
    const { data, error } = await buildOptimizedNotificationQuery(
      supabase,
      userId,
      limit,
      unreadOnly
    );
    
    if (error) {
      this.logger.error('Notifications fetch failed', { error, userId });
      throw error;
    }
    
    this.logger.info('Notifications fetched successfully', { 
      userId, 
      count: data?.length || 0 
    });
    return data || [];
  }

  /**
   * Optimized system settings fetching
   */
  static async getSystemSettings() {
    this.logger.info('Fetching optimized system settings');
    
    const { data, error } = await supabase
      .from('system_settings')
      .select(`
        id,
        setting_key,
        setting_value,
        description,
        created_at,
        updated_at
      `)
      .order('setting_key');

    if (error) {
      this.logger.error('System settings fetch failed', { error });
      throw error;
    }
    
    this.logger.info('System settings fetched successfully', { 
      count: data?.length || 0 
    });
    return data || [];
  }

  /**
   * Optimized client search with specific field selection
   */
  static async searchClientsOptimized(searchTerm: string, limit = 20) {
    this.logger.info('Performing optimized client search', { searchTerm, limit });
    
    const { data, error } = await supabase.rpc('search_clients_optimized', {
      search_term: searchTerm,
      limit_param: limit
    });
    
    if (error) {
      this.logger.error('Client search failed', { error, searchTerm });
      throw error;
    }
    
    this.logger.info('Client search completed successfully', { 
      searchTerm, 
      count: data?.length || 0 
    });
    return data || [];
  }
}