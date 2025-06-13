
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/contexts/auth/types';
import { ProposalListItem } from '@/types/proposals';

/**
 * Unified data service that replaces the complex service architecture
 * This provides a simple, clean interface for all data operations
 */
export class UnifiedDataService {
  // Simple cache with TTL
  private static cache = new Map<string, { data: any; expires: number }>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private static getCacheKey(type: string, ...params: string[]): string {
    return `${type}_${params.join('_')}`;
  }

  private static getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private static setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, expires: Date.now() + this.CACHE_TTL });
  }

  // Profile operations
  static async getProfile(userId: string, forceRefresh = false): Promise<UserProfile | null> {
    const cacheKey = this.getCacheKey('profile', userId);
    
    if (!forceRefresh) {
      const cached = this.getFromCache<UserProfile>(cacheKey);
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
        const profile: UserProfile = {
          id: data.id,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone,
          company_name: data.company_name,
          company_logo_url: data.company_logo_url,
          avatar_url: data.avatar_url,
          role: data.role,
          terms_accepted_at: data.terms_accepted_at,
          created_at: data.created_at,
          intro_video_viewed: data.intro_video_viewed,
          intro_video_viewed_at: data.intro_video_viewed_at
        };

        this.setCache(cacheKey, profile);
        return profile;
      }

      return null;
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

      // Clear cache
      const cacheKey = this.getCacheKey('profile', userId);
      this.cache.delete(cacheKey);
      
      return { success: true };
    } catch (error: any) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }
  }

  // Proposals operations
  static async getProposals(userId: string, userRole: string, forceRefresh = false): Promise<ProposalListItem[]> {
    const cacheKey = this.getCacheKey('proposals', userId, userRole);
    
    if (!forceRefresh) {
      const cached = this.getFromCache<ProposalListItem[]>(cacheKey);
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
        `)
        .is('deleted_at', null);

      // Apply role-based filtering
      if (userRole === 'agent') {
        query = query.eq('agent_id', userId);
      } else if (userRole === 'client') {
        query = query.eq('client_id', userId);
      }
      // Admin sees all proposals

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const proposals = data || [];
      this.setCache(cacheKey, proposals);
      return proposals;
    } catch (error) {
      console.error('Error fetching proposals:', error);
      return [];
    }
  }

  // Dashboard data
  static async getDashboardData(userId: string, userRole: string): Promise<{
    proposals: ProposalListItem[];
    portfolioSize: number;
    totalRevenue: number;
    co2Offset: number;
  }> {
    const proposals = await this.getProposals(userId, userRole);
    
    // Simple calculations
    const portfolioSize = proposals.reduce((sum, p) => sum + (p.system_size_kwp || 0), 0);
    const totalRevenue = proposals.reduce((sum, p) => sum + (p.carbon_credits || 0) * 50, 0);
    const co2Offset = proposals.reduce((sum, p) => sum + (p.carbon_credits || 0), 0);

    return {
      proposals,
      portfolioSize,
      totalRevenue,
      co2Offset
    };
  }

  // Client operations
  static async searchClients(searchTerm: string): Promise<Array<{
    id: string;
    name: string;
    email: string;
    company?: string;
    isRegistered: boolean;
  }>> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email, company_name, user_id')
        .or(`email.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;

      return data?.map(client => ({
        id: client.id,
        name: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
        email: client.email,
        company: client.company_name || undefined,
        isRegistered: client.user_id !== null
      })) || [];
    } catch (error) {
      console.error('Client search error:', error);
      return [];
    }
  }

  // Utility methods
  static clearCache(): void {
    this.cache.clear();
  }

  static clearCachePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}
