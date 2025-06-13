
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/contexts/auth/types';
import { ProposalListItem } from '@/types/proposals';

// Cache management
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class DataCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

const cache = new DataCache();

// Optimized data service
export class DataService {
  // Profile operations with optimized caching
  static async getProfile(userId: string, forceRefresh = false): Promise<UserProfile | null> {
    const cacheKey = `profile_${userId}`;
    
    if (!forceRefresh) {
      const cached = cache.get<UserProfile>(cacheKey);
      if (cached) return cached;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        cache.set(cacheKey, data, 10 * 60 * 1000); // 10 minutes for profiles
      }

      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }

  static async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      // Invalidate profile cache
      cache.invalidate(`profile_${userId}`);
      
      return { success: true };
    } catch (error: any) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }
  }

  // Optimized proposals fetching with better query consolidation
  static async getProposalsWithRelations(
    userId: string, 
    userRole: string, 
    forceRefresh = false
  ): Promise<ProposalListItem[]> {
    const cacheKey = `proposals_${userId}_${userRole}`;
    
    if (!forceRefresh) {
      const cached = cache.get<ProposalListItem[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      let query = supabase
        .from('proposals')
        .select(`
          *,
          agent:profiles!proposals_agent_id_fkey(first_name, last_name, email),
          client:profiles!proposals_client_id_fkey(first_name, last_name, email),
          client_contact:clients!proposals_client_reference_id_fkey(first_name, last_name, email)
        `);

      // Apply role-based filtering
      if (userRole === 'client') {
        query = query.eq('client_id', userId);
      } else if (userRole === 'agent') {
        query = query.eq('agent_id', userId);
      }
      // Admin sees all proposals (no additional filter needed)

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const proposals = data || [];
      cache.set(cacheKey, proposals, 3 * 60 * 1000); // 3 minutes for proposals

      return proposals;
    } catch (error) {
      console.error('Error fetching proposals:', error);
      return [];
    }
  }

  // Batch operations for better performance
  static async batchUpdateProposals(
    updates: Array<{ id: string; data: Partial<ProposalListItem> }>
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      const promises = updates.map(async ({ id, data }) => {
        try {
          const { error } = await supabase
            .from('proposals')
            .update(data)
            .eq('id', id);

          if (error) throw error;
        } catch (error: any) {
          errors.push(`Failed to update proposal ${id}: ${error.message}`);
        }
      });

      await Promise.all(promises);

      // Invalidate relevant caches
      cache.invalidate('proposals_');

      return { success: errors.length === 0, errors };
    } catch (error: any) {
      return { success: false, errors: [error.message] };
    }
  }

  // Dashboard data with single optimized query
  static async getDashboardData(
    userId: string, 
    userRole: string
  ): Promise<{
    proposals: ProposalListItem[];
    portfolioSize: number;
    totalRevenue: number;
    co2Offset: number;
  }> {
    const cacheKey = `dashboard_${userId}_${userRole}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const proposals = await this.getProposalsWithRelations(userId, userRole);
      
      // Calculate aggregated data
      const portfolioSize = proposals.reduce((sum, p) => sum + (p.system_size_kwp || 0), 0);
      const totalRevenue = proposals.reduce((sum, p) => sum + (p.carbon_credits || 0) * 50, 0); // Assuming R50 per credit
      const co2Offset = proposals.reduce((sum, p) => sum + (p.carbon_credits || 0), 0);

      const result = {
        proposals,
        portfolioSize,
        totalRevenue,
        co2Offset
      };

      cache.set(cacheKey, result, 2 * 60 * 1000); // 2 minutes for dashboard data

      return result;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return {
        proposals: [],
        portfolioSize: 0,
        totalRevenue: 0,
        co2Offset: 0
      };
    }
  }

  // Utility methods
  static invalidateCache(pattern: string): void {
    cache.invalidate(pattern);
  }

  static clearCache(): void {
    cache.clear();
  }
}

// Export cache instance for direct access if needed
export { cache };
