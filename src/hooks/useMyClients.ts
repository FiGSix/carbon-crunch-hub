
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
  created_at?: string;
}

export function useMyClients() {
  const { user, userRole } = useAuth();
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async (isRefresh = false) => {
    if (!user?.id || !userRole) {
      setError('User not authenticated or role not determined');
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

      const clientsData = await UnifiedDataService.getClients(user.id, userRole, isRefresh);
      
      // Transform to match expected interface - access clients array from paginated result
      const transformedClients: ClientData[] = clientsData.clients.map(client => ({
        client_id: client.id,
        client_name: client.name,
        client_email: client.email,
        company_name: client.company,
        project_count: client.projectCount,
        total_mwp: client.totalKwp / 1000, // Convert kWp to MWp
        created_at: client.createdAt
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
    if (user?.id && userRole) {
      fetchClients();
    } else {
      setIsLoading(false);
    }
  }, [user?.id, userRole]);

  return {
    clients,
    isLoading,
    isRefreshing,
    error,
    refreshClients
  };
}
