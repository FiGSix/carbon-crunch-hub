
import { UserProfile, UserRole } from '@/contexts/auth/types';
import { ProposalListItem } from '@/types/proposals';
import { CacheManager } from './cache/CacheManager';
import { ProfileDataService } from './profile/ProfileDataService';
import { ProposalsDataService } from './proposals/ProposalsDataService';
import { DashboardDataService } from './dashboard/DashboardDataService';
import { UnifiedClientService } from './clients/UnifiedClientService';
import { UnifiedCarbonService } from '@/services/calculations/UnifiedCarbonService';
import type { ClientSearchResult } from './clients/UnifiedClientService';
import type { SystemSpecs, CarbonCalculationResult } from '@/services/calculations/UnifiedCarbonService';

/**
 * Unified data service that provides a clean interface for all data operations
 * Now includes carbon calculation capabilities through UnifiedCarbonService
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

  // Client operations
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

  // Carbon calculation operations - NEW
  static async calculateCarbonCredits(specs: SystemSpecs, portfolioKWp?: number, userRole?: UserRole): Promise<CarbonCalculationResult> {
    return UnifiedCarbonService.calculateComplete(specs, portfolioKWp, userRole);
  }

  static validateSystemSize(sizeKwp: number, unitStandard?: string) {
    const normalizedSize = UnifiedCarbonService.normalizeToKWp(sizeKwp, unitStandard);
    return UnifiedCarbonService.validateSystemSize(normalizedSize);
  }

  static formatSystemSize(sizeKwp: number, preferredUnit?: 'auto' | 'kWp' | 'MWp'): string {
    return UnifiedCarbonService.formatSystemSize(sizeKwp, preferredUnit);
  }

  static calculatePortfolioMetrics(proposals: ProposalListItem[]) {
    return UnifiedCarbonService.calculatePortfolioTotals(proposals);
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
