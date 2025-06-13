
import { UserProfile } from '@/contexts/auth/types';
import { ProposalListItem } from '@/types/proposals';
import { CacheManager } from './cache/CacheManager';
import { ProfileDataService } from './profile/ProfileDataService';
import { ProposalsDataService } from './proposals/ProposalsDataService';
import { DashboardDataService } from './dashboard/DashboardDataService';
import { ClientSearchService } from './clients/ClientSearchService';

/**
 * Unified data service that provides a clean interface for all data operations
 * Now refactored into smaller, focused modules for better maintainability
 */
export class UnifiedDataService {
  // Profile operations
  static async getProfile(userId: string, forceRefresh = false): Promise<UserProfile | null> {
    return ProfileDataService.getProfile(userId, forceRefresh);
  }

  static async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
    return ProfileDataService.updateProfile(userId, updates);
  }

  // Proposals operations
  static async getProposals(userId: string, userRole: string, forceRefresh = false): Promise<ProposalListItem[]> {
    return ProposalsDataService.getProposals(userId, userRole, forceRefresh);
  }

  // Dashboard data
  static async getDashboardData(userId: string, userRole: string): Promise<{
    proposals: ProposalListItem[];
    portfolioSize: number;
    totalRevenue: number;
    co2Offset: number;
  }> {
    return DashboardDataService.getDashboardData(userId, userRole);
  }

  // Client operations
  static async searchClients(searchTerm: string): Promise<Array<{
    id: string;
    name: string;
    email: string;
    company?: string;
    isRegistered: boolean;
  }>> {
    return ClientSearchService.searchClients(searchTerm);
  }

  // Utility methods
  static clearCache(): void {
    CacheManager.clearCache();
  }

  static clearCachePattern(pattern: string): void {
    CacheManager.clearCachePattern(pattern);
  }
}
