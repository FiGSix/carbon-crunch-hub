
// Legacy DataService - now delegates to UnifiedDataService for backward compatibility
import { UnifiedDataService } from './unified/UnifiedDataService';

/**
 * @deprecated Use UnifiedDataService directly instead
 * This class is kept for backward compatibility and will be removed in a future version
 */
export class DataService {
  static async getProfile(userId: string, forceRefresh = false) {
    return UnifiedDataService.getProfile(userId, forceRefresh);
  }

  static async updateProfile(userId: string, updates: any) {
    return UnifiedDataService.updateProfile(userId, updates);
  }

  static async getProposalsWithRelations(userId: string, userRole: string, forceRefresh = false) {
    return UnifiedDataService.getProposals(userId, userRole, forceRefresh);
  }

  static async getDashboardData(userId: string, userRole: string) {
    return UnifiedDataService.getDashboardData(userId, userRole);
  }

  static invalidateCache(pattern: string): void {
    UnifiedDataService.clearCachePattern(pattern);
  }

  static clearCache(): void {
    UnifiedDataService.clearCache();
  }
}

// Export the new unified service for direct use
export { UnifiedDataService };
