import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import { useCacheInvalidation } from '@/hooks/query/useCacheInvalidation';
import { AgentsTableFilters } from './AgentsTableFilters';
import { AgentsTableContent } from './AgentsTableContent';
import { BulkActionsToolbar } from './BulkActionsToolbar';
import { TablePagination } from './TablePagination';
import { AgentsAdvancedFilters } from './enhanced-filters/AgentsAdvancedFilters';
import { useAgentsRealtime } from './realtime/useAgentsRealtime';
import { useToast } from '@/hooks/use-toast';
import { createNotification } from '@/services/notificationService';
import { AgentData } from './types';

export function ActiveAgentsTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  
  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [accessLevelFilter, setAccessLevelFilter] = useState<string>('all');
  const [commissionFilter, setCommissionFilter] = useState<string>('all');
  const [onboardingFilter, setOnboardingFilter] = useState<string>('all');
  const [joinDateFilter, setJoinDateFilter] = useState<{ from?: Date; to?: Date } | null>(null);
  
  const { toast } = useToast();
  const { invalidateAgentManagement } = useCacheInvalidation();
  
  // Enable real-time updates
  useAgentsRealtime();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.agents.management.list(
      { status: 'active', search: searchTerm, accessLevel: accessLevelFilter, commission: commissionFilter, onboarding: onboardingFilter, joinDate: joinDateFilter },
      { page: currentPage, size: pageSize }
    ),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_agents_management_data', {
        status_filter: 'active',
        search_term: searchTerm || null,
        limit_param: pageSize,
        offset_param: (currentPage - 1) * pageSize
      });

      if (error) throw error;
      
      let filteredData = data as AgentData[];

      // Apply client-side advanced filters
      if (accessLevelFilter !== 'all') {
        filteredData = filteredData.filter(agent => agent.access_level === accessLevelFilter);
      }

      if (commissionFilter !== 'all') {
        if (commissionFilter === 'default') {
          filteredData = filteredData.filter(agent => !agent.commission_override);
        } else if (commissionFilter === 'override') {
          filteredData = filteredData.filter(agent => agent.commission_override);
        }
      }

      if (onboardingFilter !== 'all') {
        if (onboardingFilter === 'completed') {
          filteredData = filteredData.filter(agent => agent.onboarding_completed);
        } else if (onboardingFilter === 'pending') {
          filteredData = filteredData.filter(agent => !agent.onboarding_completed);
        }
      }

      if (joinDateFilter?.from || joinDateFilter?.to) {
        filteredData = filteredData.filter(agent => {
          if (!agent.join_date) return false;
          const joinDate = new Date(agent.join_date);
          
          if (joinDateFilter?.from && joinDate < joinDateFilter.from) {
            return false;
          }
          if (joinDateFilter?.to && joinDate > joinDateFilter.to) {
            return false;
          }
          return true;
        });
      }

      return filteredData;
    }
  });

  const totalCount = data ? data.length : 0;

  const updateAgentStatusMutation = useMutation({
    mutationFn: async ({ agentId, status }: { agentId: string; status: string }) => {
      const { data: agentProfile } = await supabase
        .from('profiles')
        .select('email, first_name, last_name, agent_status')
        .eq('id', agentId)
        .single();
      
      const { error } = await supabase
        .from('profiles')
        .update({ agent_status: status })
        .eq('id', agentId);

      if (error) throw error;
      
      if (status === 'active' && agentProfile?.agent_status === 'pending_approval') {
        await createNotification({
          userId: agentId,
          title: 'Account Approved!',
          message: 'Your agent account has been approved. You can now start creating proposals and managing clients.',
          type: 'success',
          relatedType: 'agent_approval',
          relatedId: agentId
        });
      }
    },
    onSuccess: async () => {
      await invalidateAgentManagement();
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
    onSuccess: async () => {
      await invalidateAgentManagement();
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

  const upgradeToSPMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const { error } = await supabase.rpc('upgrade_agent_to_super_partner', { p_agent_id: agentId });
      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidateAgentManagement();
      toast({
        title: 'Agent upgraded',
        description: 'The agent is now a Super Partner. Existing proposals and commissions are preserved.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Upgrade failed',
        description: error instanceof Error ? error.message : 'Failed to upgrade agent',
        variant: 'destructive',
      });
    },
  });

  const handleUpgradeToSP = (agent: AgentData) => {
    const confirmed = window.confirm(
      `Upgrade ${agent.agent_name || agent.agent_email} to Super Partner?\n\n` +
      "This will convert the agent's account to a Super Partner. " +
      'Their existing proposals and commissions are preserved. ' +
      'This action cannot be automatically reversed.'
    );
    if (confirmed) upgradeToSPMutation.mutate(agent.agent_id);
  };


  const totalPages = Math.ceil((totalCount || 0) / pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedAgents([]);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    setSelectedAgents([]);
  };

  const handleAgentSelection = (agentId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedAgents(prev => [...prev, agentId]);
    } else {
      setSelectedAgents(prev => prev.filter(id => id !== agentId));
    }
  };

  const handleSelectAllAgents = (isSelected: boolean) => {
    if (isSelected && data) {
      setSelectedAgents(data.map(agent => agent.agent_id));
    } else {
      setSelectedAgents([]);
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setAccessLevelFilter('all');
    setCommissionFilter('all');
    setOnboardingFilter('all');
    setJoinDateFilter(null);
    setCurrentPage(1);
    setSelectedAgents([]);
  };

  const activeFilterCount = [
    searchTerm.length > 0 ? 1 : 0,
    accessLevelFilter !== 'all' ? 1 : 0,
    commissionFilter !== 'all' ? 1 : 0,
    onboardingFilter !== 'all' ? 1 : 0,
    joinDateFilter ? 1 : 0
  ].reduce((sum, val) => sum + val, 0);

  return (
    <div className="space-y-4">
      <AgentsTableFilters
        searchTerm={searchTerm}
        onSearchTermChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
          setSelectedAgents([]);
        }}
        showAdvancedFilters={showAdvancedFilters}
        onToggleAdvancedFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
      />

      {showAdvancedFilters && (
        <AgentsAdvancedFilters
          accessLevelFilter={accessLevelFilter}
          onAccessLevelFilterChange={(value) => {
            setAccessLevelFilter(value);
            setCurrentPage(1);
            setSelectedAgents([]);
          }}
          commissionFilter={commissionFilter}
          onCommissionFilterChange={(value) => {
            setCommissionFilter(value);
            setCurrentPage(1);
            setSelectedAgents([]);
          }}
          onboardingFilter={onboardingFilter}
          onOnboardingFilterChange={(value) => {
            setOnboardingFilter(value);
            setCurrentPage(1);
            setSelectedAgents([]);
          }}
          joinDateFilter={joinDateFilter}
          onJoinDateFilterChange={(dates) => {
            setJoinDateFilter(dates);
            setCurrentPage(1);
            setSelectedAgents([]);
          }}
          onClearFilters={clearAllFilters}
          activeFilterCount={activeFilterCount}
        />
      )}
      
      <BulkActionsToolbar
        selectedAgents={selectedAgents}
        onClearSelection={() => setSelectedAgents([])}
        totalAgents={data?.length || 0}
      />
      
      <AgentsTableContent
        data={data || []}
        isLoading={isLoading}
        error={error}
        selectedAgents={selectedAgents}
        onAgentSelection={handleAgentSelection}
        onSelectAllAgents={handleSelectAllAgents}
        onUpdateStatus={(agentId: string, status: string) => 
          updateAgentStatusMutation.mutate({ agentId, status })
        }
        onUpdateCommission={(agentId: string, commission: number | null) =>
          updateCommissionMutation.mutate({ agentId, commission })
        }
        onResendInvitation={() => {}}
        onCancelInvitation={() => {}}
        isUpdating={updateAgentStatusMutation.isPending || updateCommissionMutation.isPending}
        isInvitationActionPending={false}
      />

      {totalCount && totalCount > 0 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalCount}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  );
}
