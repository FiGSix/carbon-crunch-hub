import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AgentsTableFilters } from './AgentsTableFilters';
import { AgentsTableContent } from './AgentsTableContent';
import { BulkActionsToolbar } from './BulkActionsToolbar';
import { TablePagination } from './TablePagination';
import { AgentsAdvancedFilters } from './enhanced-filters/AgentsAdvancedFilters';
import { useAgentsRealtime } from './realtime/useAgentsRealtime';
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
  const [pageSize, setPageSize] = useState(20);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  
  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [accessLevelFilter, setAccessLevelFilter] = useState<string>('all');
  const [commissionFilter, setCommissionFilter] = useState<string>('all');
  const [onboardingFilter, setOnboardingFilter] = useState<string>('all');
  const [joinDateFilter, setJoinDateFilter] = useState<{ from?: Date; to?: Date } | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Enable real-time updates
  useAgentsRealtime();

  const { data, isLoading, error } = useQuery({
    queryKey: ['agents-management', statusFilter, searchTerm, accessLevelFilter, commissionFilter, onboardingFilter, joinDateFilter, currentPage, pageSize],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_agents_management_data', {
        status_filter: statusFilter === 'all' ? null : statusFilter,
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

  // Get total count for pagination (use data length for filtered results)
  const totalCount = data ? data.length : 0;

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

  const totalPages = Math.ceil((totalCount || 0) / pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedAgents([]); // Clear selection when changing pages
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
    setStatusFilter('all');
    setSearchTerm('');
    setAccessLevelFilter('all');
    setCommissionFilter('all');
    setOnboardingFilter('all');
    setJoinDateFilter(null);
    setCurrentPage(1);
    setSelectedAgents([]);
  };

  const activeFilterCount = [
    statusFilter !== 'all' ? 1 : 0,
    searchTerm.length > 0 ? 1 : 0,
    accessLevelFilter !== 'all' ? 1 : 0,
    commissionFilter !== 'all' ? 1 : 0,
    onboardingFilter !== 'all' ? 1 : 0,
    joinDateFilter ? 1 : 0
  ].reduce((sum, val) => sum + val, 0);

  const getCurrentFilters = () => ({
    statusFilter,
    searchTerm,
    accessLevelFilter,
    commissionFilter,
    onboardingFilter,
    joinDateFilter
  });

  return (
    <div className="space-y-4">
      <AgentsTableFilters
        statusFilter={statusFilter}
        onStatusFilterChange={(value) => {
          setStatusFilter(value);
          setCurrentPage(1);
          setSelectedAgents([]);
        }}
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
        isUpdating={updateAgentStatusMutation.isPending || updateCommissionMutation.isPending}
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