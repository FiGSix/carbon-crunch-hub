import { supabase } from '@/integrations/supabase/client';
import { CacheManager } from '../../cache/CacheManager';
import { devLogger } from '@/lib/performance/ConsoleReplacementUtility';

export class ClientDeleter {
  /**
   * Permanently delete a client and all their associated proposals
   * ADMIN ONLY - This is a destructive operation
   */
  static async deleteClient(clientId: string): Promise<{ success: boolean; error?: string }> {
    try {
      devLogger.clients.info(`Attempting to delete client: ${clientId}`);

      // Step 1: Soft delete all proposals associated with this client
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error: proposalError } = await supabase
        .from('proposals')
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: userId
        })
        .or(`client_id.eq.${clientId},client_reference_id.eq.${clientId}`);

      if (proposalError) {
        devLogger.clients.error('Error deleting proposals:', proposalError);
        return { success: false, error: proposalError.message };
      }

      // Step 2: Delete the client record with verification
      const { data: deletedClient, error: clientError } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)
        .select()
        .maybeSingle();

      if (clientError) {
        devLogger.clients.error('[ClientDeleter] Error deleting client:', clientError);
        return { success: false, error: clientError.message };
      }

      // Verify the row was actually deleted (RLS may silently block)
      if (!deletedClient) {
        console.error('[ClientDeleter] Delete returned no data - RLS may have blocked deletion', { clientId });
        return { 
          success: false, 
          error: 'Unable to delete client. You may not have permission, or the client does not exist.' 
        };
      }

      // Step 3: Clear cache
      CacheManager.clearCachePattern('unified_clients');
      CacheManager.clearCachePattern('clients');

      const clientName = [deletedClient.first_name, deletedClient.last_name].filter(Boolean).join(' ') || deletedClient.email;
      console.log('[ClientDeleter] Client successfully deleted', { clientId, clientName });
      devLogger.clients.info(`Successfully deleted client: ${clientId} (${clientName})`);
      return { success: true };
    } catch (error: any) {
      devLogger.clients.error('Error in deleteClient:', error);
      return { success: false, error: error.message };
    }
  }
}
