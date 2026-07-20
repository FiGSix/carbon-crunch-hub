import { supabase } from '@/integrations/supabase/client';
import { CacheManager } from '../../cache/CacheManager';
import type { CreateClientData } from '../types';
import type { Database } from '@/integrations/supabase/types';
import { devLogger } from '@/lib/performance/ConsoleReplacementUtility';

type ClientRow = Database['public']['Tables']['clients']['Row'];
type ClientInsert = Database['public']['Tables']['clients']['Insert'];

/**
 * Handles creating new client contacts
 */
export class ClientCreator {
  /**
   * Create a new client contact (unified approach)
   */
  static async createClient(clientData: CreateClientData): Promise<{ success: boolean; client?: ClientRow; error?: string }> {
    try {
      // Resolve / create client_companies row when a company name is provided
      let resolvedCompanyId: string | undefined = clientData.parentCompanyId;
      const trimmedCompany = clientData.companyName?.trim();
      if (!resolvedCompanyId && trimmedCompany) {
        try {
          const { data: existing } = await supabase
            .from('client_companies')
            .select('id')
            .ilike('company_name', trimmedCompany)
            .maybeSingle();
          if (existing?.id) {
            resolvedCompanyId = existing.id;
          } else {
            const { data: created, error: createErr } = await supabase
              .from('client_companies')
              .insert({ company_name: trimmedCompany })
              .select('id')
              .single();
            if (!createErr && created?.id) resolvedCompanyId = created.id;
          }
        } catch (e) {
          devLogger.clients.error('client_companies resolve failed:', e);
        }
      }

      const insertData = {
        first_name: clientData.firstName,
        last_name: clientData.lastName,
        email: clientData.email,
        phone: clientData.phone,
        company_name: clientData.companyName,
        registration_number: clientData.registrationNumber,
        notes: clientData.notes,
        created_by: clientData.createdBy,
        is_active: clientData.isActive ?? false,
        client_company_id: resolvedCompanyId ?? null,
        is_team_member: clientData.isTeamMember ?? false
      } as ClientInsert;

      const { data, error } = await supabase
        .from('clients')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      CacheManager.clearCachePattern('unified_clients');

      return { success: true, client: data };
    } catch (error: any) {
      devLogger.clients.error('Error creating unified client:', error);
      return { success: false, error: error.message };
    }
  }
}
