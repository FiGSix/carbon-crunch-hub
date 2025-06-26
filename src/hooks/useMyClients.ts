import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { UnifiedDataService } from '@/services/unified/UnifiedDataService';
import { logger } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';
import { createFetchErrorHandler } from '@/lib/errors/fetchErrorHandler';

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
  const { toast } = useToast();
  const handleFetchError = createFetchErrorHandler(toast);
  
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async (isRefresh = false) => {
    if (!user?.id || !userRole) {
      const errorMessage = 'User not authenticated or role not determined';
      setError(errorMessage);
      setIsLoading(false);
      
      // Show toast for initial fetch authentication errors
      if (!isRefresh) {
        handleFetchError(new Error(errorMessage), {
          isInitialFetch: true,
          toastTitle: 'Authentication Required',
          context: 'clients'
        });
      }
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
      
      const errorMessage = handleFetchError(err, {
        isInitialFetch: !isRefresh,
        isRefresh: isRefresh,
        context: 'clients',
        showToast: true
      });
      
      setError(errorMessage);
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
