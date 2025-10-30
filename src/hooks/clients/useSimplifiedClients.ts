
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import { UnifiedDataService } from '@/services/unified/UnifiedDataService';
import { ClientData } from './types';
import { createFetchErrorHandler } from '@/lib/errors/fetchErrorHandler';
import { devLogger } from '@/lib/performance/ConsoleReplacementUtility';

interface UseSimplifiedClientsResult {
  clients: ClientData[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refreshClients: () => void;
}

export function useSimplifiedClients(): UseSimplifiedClientsResult {
  // Simplified state management - no auto-refresh features
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ref for cleanup
  const mountedRef = useRef(true);
  
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const handleFetchError = createFetchErrorHandler(toast);

  // Simplified fetch function with clear state transitions
  const fetchClients = useCallback(async (isManualRefresh = false) => {
    devLogger.clients.log('fetchClients: Starting', { userId: user?.id, userRole, isManualRefresh });

    if (!user?.id || !userRole) {
      const errorMessage = 'User not authenticated or role not determined';
      setIsLoading(false);
      setError(errorMessage);
      
      // Show toast for initial fetch authentication errors
      if (!isManualRefresh) {
        handleFetchError(new Error(errorMessage), {
          isInitialFetch: true,
          toastTitle: 'Authentication Required',
          context: 'clients'
        });
      }
      return;
    }

    try {
      // Set loading state based on type of fetch
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      
      // Clear previous errors
      setError(null);

      // Fetch the data using the optimized service
      const result = await UnifiedDataService.getClients(user.id, userRole, isManualRefresh);
      
      // Transform to match expected interface
      const transformedClients: ClientData[] = result.clients.map(client => ({
        client_id: client.id,
        client_name: client.name,
        client_email: client.email,
        company_name: client.company || '',
        project_count: client.projectCount,
        total_mwp: client.totalKwp / 1000, // Convert kWp to MWp
        created_at: client.createdAt,
        agent_company_name: client.agentCompanyName,
        agent_id: client.agentId,
        is_active: client.isActive
      }));
      
      devLogger.clients.log('UnifiedDataService.getClients completed', { clientCount: transformedClients.length });
      
      // Only update state if component is still mounted
      if (mountedRef.current) {
        setClients(transformedClients);
        
        if (isManualRefresh) {
          toast({
            title: "Clients Updated",
            description: `Found ${transformedClients.length} clients`,
          });
        }
      }
    } catch (err) {
      devLogger.clients.error('Client fetch error', err);
      
      if (mountedRef.current) {
        const errorMessage = handleFetchError(err, {
          isInitialFetch: !isManualRefresh,
          isRefresh: isManualRefresh,
          context: 'clients',
          showToast: true
        });
        
        setError(errorMessage);
      }
    } finally {
      // Always clear loading states
      if (mountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [user, userRole, toast, handleFetchError]);

  // Manual refresh function
  const refreshClients = useCallback(() => {
    devLogger.clients.log('Manual refresh triggered');
    fetchClients(true);
  }, [fetchClients]);

  // Initial fetch - simplified
  useEffect(() => {
    if (user?.id && userRole) {
      fetchClients(false);
    } else {
      setIsLoading(false);
    }
  }, [user?.id, userRole, fetchClients]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    clients,
    isLoading,
    isRefreshing,
    error,
    refreshClients
  };
}
