
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import { fetchClientsData } from './clientDataProcessor';
import { ClientData } from './types';

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

  // Simplified fetch function with clear state transitions
  const fetchClients = useCallback(async (isManualRefresh = false) => {
    console.log('=== fetchClients: Starting ===');
    console.log('User:', user?.id, 'Role:', userRole, 'Manual:', isManualRefresh);

    if (!user) {
      console.log('No user - setting loading to false');
      setIsLoading(false);
      setError('User not authenticated');
      return;
    }

    try {
      // Set loading state based on type of fetch
      if (isManualRefresh) {
        console.log('Setting isRefreshing to true');
        setIsRefreshing(true);
      } else {
        console.log('Setting isLoading to true');
        setIsLoading(true);
      }
      
      // Clear previous errors
      setError(null);

      // Fetch the data
      console.log('Calling fetchClientsData...');
      const clientsData = await fetchClientsData(userRole || '', user.id);
      console.log('fetchClientsData completed with', clientsData.length, 'clients');
      
      // Only update state if component is still mounted
      if (mountedRef.current) {
        setClients(clientsData);
        console.log('State updated with clients data');
        
        if (isManualRefresh) {
          toast({
            title: "Clients Updated",
            description: `Found ${clientsData.length} clients`,
          });
        }
      }
    } catch (err) {
      console.error('=== Client fetch error ===', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch clients';
      
      if (mountedRef.current) {
        setError(errorMessage);
        
        if (isManualRefresh) {
          toast({
            title: "Refresh Failed",
            description: errorMessage,
            variant: "destructive",
          });
        }
      }
    } finally {
      // Always clear loading states
      if (mountedRef.current) {
        console.log('Clearing loading states');
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [user, userRole, toast]);

  // Manual refresh function
  const refreshClients = useCallback(() => {
    console.log('Manual refresh triggered');
    fetchClients(true);
  }, [fetchClients]);

  // Initial fetch - simplified
  useEffect(() => {
    console.log('Initial fetch effect triggered');
    if (user) {
      fetchClients(false);
    } else {
      console.log('No user - setting loading to false immediately');
      setIsLoading(false);
    }
  }, [user, userRole]); // Only depend on user and userRole

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  console.log('=== useSimplifiedClients: Current state ===');
  console.log('Loading:', isLoading, 'Refreshing:', isRefreshing, 'Error:', error, 'Clients:', clients.length);

  return {
    clients,
    isLoading,
    isRefreshing,
    error,
    refreshClients
  };
}
