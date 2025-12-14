
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

export interface ClientCompanyMembership {
  clientCompanyId: string;
  canSignAgreements: boolean;
  role: 'account_admin' | 'member';
}

/**
 * Hook to fetch the current user's client company membership info
 * Used for determining if a user can take actions on proposals for their company
 */
export function useClientCompanyMembership() {
  const { user, userRole } = useAuth();
  const [membership, setMembership] = useState<ClientCompanyMembership | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchMembership() {
      if (!user?.id || userRole !== 'client') {
        setMembership(null);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('client_company_members')
          .select('client_company_id, can_sign_agreements, role')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (error || !data) {
          setMembership(null);
          return;
        }

        setMembership({
          clientCompanyId: data.client_company_id,
          canSignAgreements: data.can_sign_agreements,
          role: data.role as 'account_admin' | 'member'
        });
      } catch (err) {
        console.error('Error fetching client company membership:', err);
        setMembership(null);
      } finally {
        setLoading(false);
      }
    }

    fetchMembership();
  }, [user?.id, userRole]);

  return { membership, loading };
}
