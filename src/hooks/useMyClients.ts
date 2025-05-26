
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import { fetchClientsData } from './clients/clientDataProcessor';
import { useAutoRefresh } from './clients/useAutoRefresh';
import { useRealtimeSubscription } from './clients/useRealtimeSubscription';
import { ClientData, UseMyClientsResult } from './clients/types';

export function useMyClients(): UseMyClientsResult {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds default
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  const fetchClients = useCallback(async (isManualRefresh = false) => {
    console.log('=== useMyClients: Starting fetch ===');
    console.log('User:', user?.id);
    console.log('User Role:', userRole);
    console.log('Manual refresh:', isManualRefresh);

    if (!user) {
      console.log('No user - setting loading to false');
      setIsLoading(false);
      setError('User not authenticated');
      return;
    }

    try {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const clientsData = await fetchClientsData(userRole || '', user.id);
      setClients(clientsData);

      if (isManualRefresh) {
        toast({
          title: "Clients Updated",
          description: `Found ${clientsData.length} clients`,
        });
      }
    } catch (err) {
      console.error('=== Client fetch error ===', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch clients';
      setError(errorMessage);
      
      if (isManualRefresh) {
        toast({
          title: "Refresh Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      console.log('=== Setting loading states to false ===');
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user, userRole, toast]);

  const refreshClients = useCallback(() => {
    console.log('Manual refresh triggered');
    fetchClients(true);
  }, [fetchClients]);

  // Setup auto-refresh
  useAutoRefresh({
    enabled: autoRefreshEnabled,
    interval: refreshInterval,
    onRefresh: () => fetchClients(false)
  });

  // Setup real-time subscription
  useRealtimeSubscription({
    user,
    onDataChange: () => fetchClients(false)
  });

  // Initial fetch
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  console.log('=== useMyClients: Current state ===');
  console.log('Loading:', isLoading);
  console.log('Refreshing:', isRefreshing);
  console.log('Error:', error);
  console.log('Clients count:', clients.length);
  console.log('Auto-refresh enabled:', autoRefreshEnabled);

  return { 
    clients, 
    isLoading, 
    isRefreshing,
    error, 
    refreshClients,
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    refreshInterval,
    setRefreshInterval
  };
}

// Re-export types for backward compatibility
export type { ClientData } from './clients/types';
