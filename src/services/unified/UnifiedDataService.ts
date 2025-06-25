
import { UserProfile, UserRole } from '@/contexts/auth/types';
import { ProposalListItem } from '@/types/proposals';
import { CacheManager } from './cache/CacheManager';
import { ProfileDataService } from './profile/ProfileDataService';
import { ProposalsDataService } from './proposals/ProposalsDataService';
import { DashboardDataService } from './dashboard/DashboardDataService';
import { UnifiedClientService } from './clients/UnifiedClientService';
import type { ClientSearchResult } from './clients/UnifiedClientService';

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
  static async getProposals(userId: string, userRole: UserRole, forceRefresh = false): Promise<ProposalListItem[]> {
    return ProposalsDataService.getProposals(userId, userRole, forceRefresh);
  }

  // Client operations - now using unified service
  static async getClients(userId: string, userRole: UserRole, forceRefresh = false) {
    return UnifiedClientService.getClients(userId, userRole, forceRefresh);
  }

  static async createClient(clientData: any) {
    return UnifiedClientService.createClient(clientData);
  }

  static async searchClients(searchTerm: string): Promise<ClientSearchResult[]> {
    return UnifiedClientService.searchClients(searchTerm);
  }

  // Dashboard data
  static async getDashboardData(userId: string, userRole: UserRole): Promise<{
    proposals: ProposalListItem[];
    portfolioSize: number;
    totalRevenue: number;
    co2Offset: number;
  }> {
    return DashboardDataService.getDashboardData(userId, userRole);
  }

  // Utility methods
  static clearCache(): void {
    CacheManager.clearCache();
    UnifiedClientService.clearCache();
  }

  static clearCachePattern(pattern: string): void {
    CacheManager.clearCachePattern(pattern);
    if (pattern.includes('client')) {
      UnifiedClientService.clearCache();
    }
  }
}
