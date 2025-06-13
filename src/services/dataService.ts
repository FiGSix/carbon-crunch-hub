import { supabase } from '@/integrations/supabase/client';
import { UserProfile, UserRole } from '@/contexts/auth/types';
import { ProposalListItem, ProposalContent } from '@/types/proposals';

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

// Helper function to safely cast role
function castUserRole(role: string | null | undefined): UserRole | undefined {
  if (!role) return undefined;
  if (['client', 'agent', 'admin'].includes(role)) {
    return role as UserRole;
  }
  return undefined;
}

// Helper function to transform raw proposal data to ProposalListItem
function transformToProposalListItem(rawProposal: any): ProposalListItem {
  // Extract client and agent names
  const clientName = rawProposal.client 
    ? `${rawProposal.client.first_name || ''} ${rawProposal.client.last_name || ''}`.trim() || 'Unknown Client'
    : rawProposal.client_contact
    ? `${rawProposal.client_contact.first_name || ''} ${rawProposal.client_contact.last_name || ''}`.trim() || 'Unknown Client'
    : 'Unknown Client';

  const agentName = rawProposal.agent
    ? `${rawProposal.agent.first_name || ''} ${rawProposal.agent.last_name || ''}`.trim() || 'Unknown Agent'
    : 'Unknown Agent';

  // Calculate revenue (simplified calculation)
  const carbonCredits = rawProposal.carbon_credits || 0;
  const sharePercentage = rawProposal.client_share_percentage || 0;
  const revenue = carbonCredits && sharePercentage 
    ? Math.round(carbonCredits * 25 * (sharePercentage / 100))
    : 0;

  return {
    id: rawProposal.id,
    name: rawProposal.title || `Project ${rawProposal.id}`,
    title: rawProposal.title || `Project ${rawProposal.id}`,
    client: clientName,
    client_name: clientName,
    client_email: rawProposal.client?.email || rawProposal.client_contact?.email || 'No email',
    agent: agentName,
    agent_name: agentName,
    date: rawProposal.created_at,
    created_at: rawProposal.created_at,
    size: rawProposal.system_size_kwp || 0,
    system_size_kwp: rawProposal.system_size_kwp || 0,
    status: rawProposal.status,
    revenue: revenue,
    signed_at: rawProposal.signed_at,
    archived_at: rawProposal.archived_at,
    review_later_until: rawProposal.review_later_until,
    client_id: rawProposal.client_id,
    client_reference_id: rawProposal.client_reference_id,
    agent_id: rawProposal.agent_id,
    annual_energy: rawProposal.annual_energy,
    carbon_credits: rawProposal.carbon_credits,
    client_share_percentage: rawProposal.client_share_percentage,
    agent_commission_percentage: rawProposal.agent_commission_percentage,
    invitation_sent_at: rawProposal.invitation_sent_at,
    invitation_viewed_at: rawProposal.invitation_viewed_at,
    invitation_expires_at: rawProposal.invitation_expires_at,
    content: rawProposal.content
  };
}

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
        // Transform raw data to UserProfile with proper type casting
        const profile: UserProfile = {
          id: data.id,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone,
          company_name: data.company_name,
          company_logo_url: data.company_logo_url,
          avatar_url: data.avatar_url,
          role: castUserRole(data.role),
          terms_accepted_at: data.terms_accepted_at,
          created_at: data.created_at,
          intro_video_viewed: data.intro_video_viewed,
          intro_video_viewed_at: data.intro_video_viewed_at
        };

        cache.set(cacheKey, profile, 10 * 60 * 1000); // 10 minutes for profiles
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

      // Transform raw data to ProposalListItem[]
      const proposals = (data || []).map(transformToProposalListItem);
      cache.set(cacheKey, proposals, 3 * 60 * 1000); // 3 minutes for proposals

      return proposals;
    } catch (error) {
      console.error('Error fetching proposals:', error);
      return [];
    }
  }

  // Batch operations for better performance
  static async batchUpdateProposals(
    updates: Array<{ id: string; data: Partial<{ 
      status: string; 
      title: string; 
      carbon_credits: number;
      client_share_percentage: number;
      agent_commission_percentage: number;
      content: any; // Use any for Supabase Json compatibility
    }> }>
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
      // Return proper structure with all required properties, not empty object
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
