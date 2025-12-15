import { supabase } from '@/integrations/supabase/client';
import { devLogger } from '@/lib/performance/ConsoleReplacementUtility';

export interface UpdateClientData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  registrationNumber?: string;
  notes?: string;
  createdBy?: string;
}

export class ClientUpdater {
  static async updateClient(
    clientId: string, 
    updates: UpdateClientData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      devLogger.clients.info('Updating client:', { clientId, updates });

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }

      const clientUpdate: any = {
        updated_at: new Date().toISOString(),
        last_modified_by: userId,
      };

      if (updates.firstName !== undefined) clientUpdate.first_name = updates.firstName;
      if (updates.lastName !== undefined) clientUpdate.last_name = updates.lastName;
      if (updates.email !== undefined) clientUpdate.email = updates.email;
      if (updates.phone !== undefined) clientUpdate.phone = updates.phone;
      if (updates.companyName !== undefined) clientUpdate.company_name = updates.companyName;
      if (updates.registrationNumber !== undefined) clientUpdate.registration_number = updates.registrationNumber;
      if (updates.notes !== undefined) clientUpdate.notes = updates.notes;
      if (updates.createdBy !== undefined) clientUpdate.created_by = updates.createdBy;

      const { data, error: updateError } = await supabase
        .from('clients')
        .update(clientUpdate)
        .eq('id', clientId)
        .select('id')
        .single();

      if (updateError) {
        devLogger.clients.error('Error updating client:', updateError);
        return { success: false, error: updateError.message };
      }

      if (!data) {
        devLogger.clients.error('No client updated - possibly RLS blocked:', clientId);
        return { success: false, error: 'Update failed - insufficient permissions or client not found' };
      }

      devLogger.clients.info('Client updated successfully:', clientId);
      return { success: true };
    } catch (error) {
      devLogger.clients.error('Unexpected error updating client:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
