
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { UnifiedDataService } from '@/services/unified/UnifiedDataService';
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

      const clientsData = await UnifiedDataService.getClients(user.id, userRole || 'client', isRefresh);
      
      // Transform to match expected interface
      const transformedClients: ClientData[] = clientsData.map(client => ({
        client_id: client.id,
        client_name: client.name,
        client_email: client.email,
        company_name: client.company_name,
        project_count: client.project_count,
        total_mwp: client.total_kwp / 1000 // Convert kWp to MWp
      }));

      setClients(transformedClients);
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
