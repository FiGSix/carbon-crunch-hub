import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AgentsTableFilters } from './AgentsTableFilters';
import { AgentsTableContent } from './AgentsTableContent';
import { useToast } from '@/hooks/use-toast';

export interface AgentData {
  agent_id: string;
  agent_name: string;
  agent_email: string;
  company_name: string | null;
  agent_status: string;
  access_level: string;
  commission_override: number | null;
  last_active_at: string | null;
  total_proposals: number;
  active_proposals: number;
  signed_proposals: number;
  total_commission: number;
  join_date: string | null;
  onboarding_completed: boolean;
}

export function AgentsManagementTable() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['agents-management', statusFilter, searchTerm, currentPage],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_agents_management_data', {
        status_filter: statusFilter === 'all' ? null : statusFilter,
        search_term: searchTerm || null,
        limit_param: pageSize,
        offset_param: (currentPage - 1) * pageSize
      });

      if (error) throw error;
      return data as AgentData[];
    }
  });

  const updateAgentStatusMutation = useMutation({
    mutationFn: async ({ agentId, status }: { agentId: string; status: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ agent_status: status })
        .eq('id', agentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents-management'] });
      queryClient.invalidateQueries({ queryKey: ['agent-management-stats'] });
      toast({
        title: "Status Updated",
        description: "Agent status has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update agent status",
        variant: "destructive",
      });
    }
  });

  const updateCommissionMutation = useMutation({
    mutationFn: async ({ agentId, commission }: { agentId: string; commission: number | null }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ commission_override: commission })
        .eq('id', agentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents-management'] });
      toast({
        title: "Commission Updated",
        description: "Agent commission override has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update commission",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="space-y-4">
      <AgentsTableFilters
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
      />
      
      <AgentsTableContent
        data={data || []}
        isLoading={isLoading}
        error={error}
        onUpdateStatus={(agentId: string, status: string) => 
          updateAgentStatusMutation.mutate({ agentId, status })
        }
        onUpdateCommission={(agentId: string, commission: number | null) =>
          updateCommissionMutation.mutate({ agentId, commission })
        }
        isUpdating={updateAgentStatusMutation.isPending || updateCommissionMutation.isPending}
      />
    </div>
  );
}