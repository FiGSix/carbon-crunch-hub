import { UserRole } from '@/contexts/auth/types';
import { ClientFetcher } from './operations/ClientFetcher';
import { ClientCreator } from './operations/ClientCreator';
import type { PaginatedClientsResult, CreateClientData } from './types';
import type { Database } from '@/integrations/supabase/types';

type ClientRow = Database['public']['Tables']['clients']['Row'];

/**
 * Main operations class that delegates to specialized modules
 * @deprecated Use ClientFetcher and ClientCreator directly for better separation of concerns
 */
export class ClientOperations {
  /**
   * Get all clients for an agent (unified view of registered users and contacts) with pagination
   */
  static async getClients(
    userId: string, 
    userRole: UserRole, 
    forceRefresh = false,
    limit = 20,
    offset = 0
  ): Promise<PaginatedClientsResult> {
    return ClientFetcher.getClients(userId, userRole, forceRefresh, limit, offset);
  }

  /**
   * Create a new client contact (unified approach)
   */
  static async createClient(clientData: CreateClientData): Promise<{ success: boolean; client?: ClientRow; error?: string }> {
    return ClientCreator.createClient(clientData);
  }
}