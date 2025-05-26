import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

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
  const [error, setError] = useState<string | null>(null);
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  // Create a contextualized logger
  const clientsLogger = logger.withContext({ 
    component: 'useMyClients', 
    feature: 'clients' 
  });

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setError('User not authenticated');
      return;
    }

    const fetchClients = async () => {
      try {
        setIsLoading(true);
        setError(null);

        clientsLogger.info("Fetching client data from proposals", { 
          userRole,
          userId: user?.id 
        });

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

        // Apply role-based filtering similar to proposals
        if (userRole === 'admin') {
          // Admin users see all proposals
          clientsLogger.info('Admin user detected - fetching all proposals');
        } else if (userRole === 'agent' && user?.id) {
          // Agents see only their proposals
          query = query.eq('agent_id', user.id);
        } else {
          // Other roles see no data for now
          setClients([]);
          setIsLoading(false);
          return;
        }

        const { data: proposalsData, error: queryError } = await query;

        if (queryError) {
          clientsLogger.error("Error fetching proposals for clients", { error: queryError });
          throw queryError;
        }

        clientsLogger.info("Proposals data fetched", { 
          count: proposalsData?.length || 0 
        });

        if (!proposalsData || proposalsData.length === 0) {
          setClients([]);
          setIsLoading(false);
          return;
        }

        // Group by client and aggregate data
        const clientMap = new Map<string, ClientData>();

        proposalsData.forEach(proposal => {
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
            }
          } catch (error) {
            clientsLogger.warn("Error parsing proposal content", { 
              proposalId: proposal.id, 
              error 
            });
          }

          // Use email as fallback ID if no client_id
          if (!clientId && clientEmail) {
            clientId = clientEmail;
          }

          if (!clientId) {
            clientsLogger.warn("No client identifier found for proposal", { 
              proposalId: proposal.id 
            });
            return;
          }

          const existingClient = clientMap.get(clientId);
          const annualEnergy = proposal.annual_energy || 0;

          if (existingClient) {
            existingClient.project_count += 1;
            existingClient.total_mwp += annualEnergy / 1000; // Convert kW to MW
          } else {
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
          .filter(client => client.client_name !== 'Unknown Client')
          .sort((a, b) => a.client_name.localeCompare(b.client_name));

        clientsLogger.info("Client data processed", { 
          uniqueClients: clientsArray.length 
        });

        setClients(clientsArray);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch clients';
        clientsLogger.error('Client fetch error:', err);
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, [user, userRole, toast, clientsLogger]);

  return { clients, isLoading, error };
}
