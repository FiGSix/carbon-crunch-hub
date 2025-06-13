
import { UserProfile } from '@/contexts/auth/types';
import { ProposalListItem } from '@/types/proposals';
import { ProfileService } from './profile/ProfileService';
import { ProposalService } from './proposal/ProposalService';
import { DashboardService } from './dashboard/DashboardService';
import { cacheService } from './cache/CacheService';

// Optimized data service that delegates to specialized services
export class DataService {
  // Profile operations with optimized caching
  static async getProfile(userId: string, forceRefresh = false): Promise<UserProfile | null> {
    return ProfileService.getProfile(userId, forceRefresh);
  }

  static async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
    return ProfileService.updateProfile(userId, updates);
  }

  // Optimized proposals fetching with better query consolidation
  static async getProposalsWithRelations(
    userId: string, 
    userRole: string, 
    forceRefresh = false
  ): Promise<ProposalListItem[]> {
    return ProposalService.getProposalsWithRelations(userId, userRole, forceRefresh);
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
    return ProposalService.batchUpdateProposals(updates);
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
    return DashboardService.getDashboardData(userId, userRole);
  }

  // Utility methods
  static invalidateCache(pattern: string): void {
    cacheService.invalidate(pattern);
  }

  static clearCache(): void {
    cacheService.clear();
  }
}

// Export cache instance for direct access if needed
export { cacheService as cache };
