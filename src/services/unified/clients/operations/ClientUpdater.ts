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

      // Sync to profiles table if this client has a linked user account
      try {
        const { data: clientRecord } = await supabase
          .from('clients')
          .select('user_id')
          .eq('id', clientId)
          .single();

        if (clientRecord?.user_id) {
          const profileUpdate: any = {};
          if (updates.firstName !== undefined) profileUpdate.first_name = updates.firstName;
          if (updates.lastName !== undefined) profileUpdate.last_name = updates.lastName;
          if (updates.phone !== undefined) profileUpdate.phone = updates.phone;
          if (updates.companyName !== undefined) profileUpdate.company_name = updates.companyName;
          // Email intentionally excluded — tied to auth identity

          if (Object.keys(profileUpdate).length > 0) {
            const { error: profileError } = await supabase
              .from('profiles')
              .update(profileUpdate)
              .eq('id', clientRecord.user_id);

            if (profileError) {
              devLogger.clients.warn('Failed to sync profile for client:', clientId, profileError.message);
            }
          }
        }
      } catch (syncErr) {
        devLogger.clients.warn('Exception syncing client to profile:', syncErr);
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
