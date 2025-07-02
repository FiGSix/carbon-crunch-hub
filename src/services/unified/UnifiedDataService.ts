import { UserProfile, UserRole } from '@/contexts/auth/types';
import { ProposalListItem } from '@/types/proposals';
import { CacheManager } from './cache/CacheManager';
import { ProfileDataService } from './profile/ProfileDataService';
import { SecureProfileService } from '../profile/SecureProfileService';
import { ProposalsDataService } from './proposals/ProposalsDataService';
import { DashboardDataService } from './dashboard/DashboardDataService';
import { UnifiedClientService } from './clients/UnifiedClientService';
import { UnifiedCarbonService } from '@/services/calculations/carbon';
import { RoleValidationService } from '../auth/RoleValidationService';
import { synchronizeUserRole } from '@/lib/supabase/profile';
import type { ClientSearchResult } from './clients/UnifiedClientService';
import type { SystemSpecs, CarbonCalculationResult } from '@/services/calculations/carbon';

/**
 * Unified data service - single interface for all data operations
 * Now includes role validation and synchronization capabilities
 */
export class UnifiedDataService {
  // Profile operations
  static async getProfile(userId: string, forceRefresh = false): Promise<UserProfile | null> {
    return ProfileDataService.getProfile(userId, forceRefresh);
  }

  static async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
    return ProfileDataService.updateProfile(userId, updates);
  }

  /**
   * SECURE: Get profile by ID with proper authorization
   * Requires current user context for security validation
   */
  static async getProfileById(
    targetProfileId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<{ profile: Partial<UserProfile> | null; error?: string }> {
    return SecureProfileService.getProfileById(targetProfileId, currentUserId, currentUserRole);
  }

  // Role validation and synchronization operations
  static async validateUserRole(userId: string) {
    return RoleValidationService.validateUserRole(userId);
  }

  static async correctUserRole(userId: string) {
    return RoleValidationService.correctUserRole(userId);
  }

  static async synchronizeUserRole(userId: string) {
    return synchronizeUserRole(userId);
  }

  static async batchValidateRoles(userIds: string[]) {
    return RoleValidationService.batchValidateRoles(userIds);
  }

  // Proposals operations
  static async getProposals(userId: string, userRole: UserRole, forceRefresh = false): Promise<ProposalListItem[]> {
    return ProposalsDataService.getProposals(userId, userRole, forceRefresh);
  }

  // Client operations
  static async getClients(
    userId: string, 
    userRole: UserRole, 
    forceRefresh = false,
    limit = 20,
    offset = 0
  ) {
    return UnifiedClientService.getClients(userId, userRole, forceRefresh, limit, offset);
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

  // Carbon calculation operations - using consolidated UnifiedCarbonService
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

  // Security audit operations
  static getSecurityAuditLogs(currentUserRole: UserRole) {
    return SecureProfileService.getAuditLogs(currentUserRole);
  }

  static clearSecurityAuditLogs(currentUserRole: UserRole): boolean {
    return SecureProfileService.clearAuditLogs(currentUserRole);
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
