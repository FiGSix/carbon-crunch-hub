
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';

export interface ClientData {
  client_id: string;
  client_name: string;
  client_email: string;
  company_name: string;
  is_registered: boolean;
  project_count: number;
  total_mwp: number;
  agent_id: string;
  agent_name: string;
}

export function useMyClients() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const fetchClients = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // For admins, get all clients; for agents, get only their clients
        const agentId = userRole === 'admin' ? null : user.id;
        
        const { data, error } = await supabase.rpc('get_agent_clients', {
          agent_id_param: agentId
        });

        if (error) {
          console.error('Error fetching clients:', error);
          throw error;
        }

        setClients(data || []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch clients';
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
  }, [user, userRole, toast]);

  return { clients, isLoading, error };
}
