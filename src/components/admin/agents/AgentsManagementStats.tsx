import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Users, UserCheck, UserX, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AgentStats {
  total_agents: number;
  active_agents: number;
  inactive_agents: number;
  pending_approval: number;
  suspended_agents: number;
}

export function AgentsManagementStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: queryKeys.agents.management.stats(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('agent_status')
        .eq('role', 'agent');

      if (error) throw error;

      const stats: AgentStats = {
        total_agents: data.length,
        active_agents: data.filter(p => p.agent_status === 'active').length,
        inactive_agents: data.filter(p => p.agent_status === 'inactive').length,
        pending_approval: data.filter(p => p.agent_status === 'pending_approval').length,
        suspended_agents: data.filter(p => p.agent_status === 'suspended').length,
      };

      return stats;
    }
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const statsCards = [
    {
      title: "Total Agents",
      value: stats?.total_agents || 0,
      icon: Users,
      description: "All registered agents"
    },
    {
      title: "Active Agents",
      value: stats?.active_agents || 0,
      icon: UserCheck,
      description: "Currently active agents",
      trend: stats?.active_agents ? `${Math.round((stats.active_agents / stats.total_agents) * 100)}%` : "0%"
    },
    {
      title: "Pending Approval",
      value: stats?.pending_approval || 0,
      icon: AlertTriangle,
      description: "Awaiting admin approval",
      isAlert: (stats?.pending_approval || 0) > 0
    },
    {
      title: "Inactive/Suspended",
      value: (stats?.inactive_agents || 0) + (stats?.suspended_agents || 0),
      icon: UserX,
      description: "Not currently active",
      isNegative: true
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsCards.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <StatsCard
            key={index}
            title={stat.title}
            value={stat.value.toString()}
            icon={<IconComponent className="h-4 w-4" />}
            trend={stat.trend}
            className={
              stat.isAlert ? "border-warning" : 
              stat.isNegative ? "border-destructive" : ""
            }
          />
        );
      })}
    </div>
  );
}