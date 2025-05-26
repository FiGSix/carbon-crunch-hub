
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';

export interface ClientData {
  client_id: string;
  client_name: string;
  client_email: string;
  company_name: string;
  total_mwp: number;
  project_count: number;
}

export function useMyClients() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds default
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionRef = useRef<any>(null);

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

      // Build query similar to proposals
      let query = supabase
        .from('proposals')
        .select(`
          id,
          content,
          client_id,
          client_reference_id,
          agent_id,
          annual_energy
        `);

      console.log('User role check:', userRole);

      // Apply role-based filtering
      if (userRole === 'admin') {
        console.log('Admin user - fetching all proposals');
        // Admin sees all proposals
      } else if (userRole === 'agent' && user?.id) {
        console.log('Agent user - filtering by agent_id:', user.id);
        query = query.eq('agent_id', user.id);
      } else {
        console.log('Other role or no user ID - returning empty data');
        setClients([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      console.log('Executing query...');
      const { data: proposalsData, error: queryError } = await query;

      if (queryError) {
        console.error('Query error:', queryError);
        throw queryError;
      }

      console.log('Query successful. Proposals count:', proposalsData?.length || 0);

      if (!proposalsData || proposalsData.length === 0) {
        console.log('No proposals found - setting empty clients array');
        setClients([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      // Group by client and aggregate data
      console.log('Processing client data...');
      const clientMap = new Map<string, ClientData>();

      proposalsData.forEach((proposal, index) => {
        console.log(`Processing proposal ${index + 1}:`, proposal.id);
        
        let clientId = proposal.client_reference_id || proposal.client_id;
        let clientName = 'Unknown Client';
        let clientEmail = '';
        let companyName = '';

        // Extract client info from proposal content
        try {
          const content = proposal.content as any;
          if (content?.clientInfo) {
            clientName = content.clientInfo.name || clientName;
            clientEmail = content.clientInfo.email || '';
            companyName = content.clientInfo.companyName || '';
            console.log(`Client info from content: ${clientName} (${clientEmail})`);
          }
        } catch (error) {
          console.warn(`Error parsing proposal ${proposal.id} content:`, error);
        }

        // Use email as fallback ID if no client_id
        if (!clientId && clientEmail) {
          clientId = clientEmail;
          console.log(`Using email as client ID: ${clientEmail}`);
        }

        if (!clientId) {
          console.warn(`No client identifier found for proposal ${proposal.id} - skipping`);
          return;
        }

        const existingClient = clientMap.get(clientId);
        const annualEnergy = proposal.annual_energy || 0;

        if (existingClient) {
          console.log(`Updating existing client: ${clientId}`);
          existingClient.project_count += 1;
          existingClient.total_mwp += annualEnergy / 1000; // Convert kW to MW
        } else {
          console.log(`Creating new client: ${clientId} (${clientName})`);
          clientMap.set(clientId, {
            client_id: clientId,
            client_name: clientName,
            client_email: clientEmail,
            company_name: companyName,
            total_mwp: annualEnergy / 1000, // Convert kW to MW
            project_count: 1
          });
        }
      });

      const clientsArray = Array.from(clientMap.values())
        .filter(client => {
          const isValid = client.client_name !== 'Unknown Client';
          if (!isValid) {
            console.log(`Filtering out client with unknown name: ${client.client_id}`);
          }
          return isValid;
        })
        .sort((a, b) => a.client_name.localeCompare(b.client_name));

      console.log('=== Final client data ===');
      console.log('Unique clients found:', clientsArray.length);

      setClients(clientsArray);

      if (isManualRefresh) {
        toast({
          title: "Clients Updated",
          description: `Found ${clientsArray.length} clients`,
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
  const setupAutoRefresh = useCallback(() => {
    if (autoRefreshEnabled && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        console.log('Auto-refresh triggered');
        fetchClients(false);
      }, refreshInterval);
    }
  }, [autoRefreshEnabled, refreshInterval, fetchClients]);

  // Setup real-time subscription
  const setupRealtimeSubscription = useCallback(() => {
    if (!user) return;

    console.log('Setting up real-time subscription for proposals');
    
    subscriptionRef.current = supabase
      .channel('proposals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'proposals'
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          // Debounce the refresh to avoid too many updates
          setTimeout(() => {
            console.log('Triggering refresh from real-time update');
            fetchClients(false);
          }, 1000);
        }
      )
      .subscribe();
  }, [user, fetchClients]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
  }, []);

  // Initial fetch and setup
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Setup auto-refresh when settings change
  useEffect(() => {
    cleanup();
    setupAutoRefresh();
    setupRealtimeSubscription();

    return cleanup;
  }, [autoRefreshEnabled, refreshInterval, setupAutoRefresh, setupRealtimeSubscription, cleanup]);

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
