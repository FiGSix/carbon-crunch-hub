
import { UserRole } from '@/contexts/auth/types';
import { CacheManager } from '../cache/CacheManager';
import { ClientFetcher, ClientCreator } from './operations';
import { ClientSearch } from './ClientSearch';
import { ClientDeleter } from './operations/ClientDeleter';

// Re-export types for backward compatibility
export type { 
  UnifiedClient, 
  ClientSearchResult, 
  PaginatedClientsResult,
  CreateClientData 
} from './types';

/**
 * Unified client service that consolidates registered users and contact clients
 * This is the single source of truth for all client operations
 */
export class UnifiedClientService {
  /**
   * Get all clients for an agent (unified view of registered users and contacts) with pagination
   */
  static async getClients(
    userId: string, 
    userRole: UserRole, 
    forceRefresh = false,
    limit = 20,
    offset = 0,
    search?: string
  ) {
    return ClientFetcher.getClients(userId, userRole, forceRefresh, limit, offset, search);
  }

  /**
   * Search for clients across both registered users and contacts
   */
  static async searchClients(searchTerm: string) {
    return ClientSearch.searchClients(searchTerm);
  }

  /**
   * Create a new client contact (unified approach)
   */
  static async createClient(clientData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    companyName?: string;
    notes?: string;
    createdBy: string;
  }) {
    return ClientCreator.createClient(clientData);
  }

  /**
   * Update client information (agents can update own clients, admins can update all)
   */
  static async updateClient(clientId: string, updates: any) {
    const { ClientUpdater } = await import('./operations/ClientUpdater');
    return ClientUpdater.updateClient(clientId, updates);
  }

  /**
   * Delete a client and all associated proposals (ADMIN ONLY)
   */
  static async deleteClient(clientId: string) {
    return ClientDeleter.deleteClient(clientId);
  }

  /**
   * Clear all client-related cache
   */
  static clearCache(): void {
    CacheManager.clearCachePattern('unified_clients');
    CacheManager.clearCachePattern('clients');
  }
}
