
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProposalData } from '@/types/proposals';

/**
 * Hook to fetch the client company ID for a proposal
 * Looks up the client via client_reference_id and gets their client_company_id
 */
export function useProposalClientCompanyId(proposal: ProposalData | null) {
  const [clientCompanyId, setClientCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchClientCompanyId() {
      if (!proposal?.client_reference_id) {
        setClientCompanyId(null);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('client_company_id')
          .eq('id', proposal.client_reference_id)
          .single();

        if (error || !data) {
          console.log('Could not fetch client company ID:', error?.message);
          setClientCompanyId(null);
          return;
        }

        setClientCompanyId(data.client_company_id);
      } catch (err) {
        console.error('Error fetching client company ID:', err);
        setClientCompanyId(null);
      } finally {
        setLoading(false);
      }
    }

    fetchClientCompanyId();
  }, [proposal?.client_reference_id]);

  return { clientCompanyId, loading };
}
