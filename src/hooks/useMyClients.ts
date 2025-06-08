
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export interface ClientData {
  client_id: string;
  client_name: string;
  client_email: string;
  company_name?: string;
  project_count: number;
  total_mwp: number;
}

export function useMyClients() {
  const { user, userRole } = useAuth();
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async (isRefresh = false) => {
    if (!user?.id) {
      setError('User not authenticated');
      setIsLoading(false);
      return;
    }

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      let query = supabase
        .from('clients')
        .select(`
          id,
          email,
          first_name,
          last_name,
          company_name,
          proposals!inner(
            id,
            system_size_kwp
          )
        `);

      // Filter by user role
      if (userRole !== 'admin') {
        query = query.eq('proposals.agent_id', user.id);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      // Process the data to get client summaries
      const clientMap = new Map<string, ClientData>();

      data?.forEach((client: any) => {
        const clientId = client.id;
        if (!clientMap.has(clientId)) {
          clientMap.set(clientId, {
            client_id: clientId,
            client_name: `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unnamed Client',
            client_email: client.email,
            company_name: client.company_name,
            project_count: 0,
            total_mwp: 0
          });
        }

        const clientData = clientMap.get(clientId)!;
        clientData.project_count++;
        clientData.total_mwp += (client.proposals?.system_size_kwp || 0) / 1000; // Convert kWp to MWp
      });

      setClients(Array.from(clientMap.values()));
    } catch (err) {
      logger.error('Error fetching clients', { error: err });
      setError(err instanceof Error ? err.message : 'Failed to fetch clients');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const refreshClients = () => {
    fetchClients(true);
  };

  useEffect(() => {
    fetchClients();
  }, [user?.id, userRole]);

  return {
    clients,
    isLoading,
    isRefreshing,
    error,
    refreshClients
  };
}
