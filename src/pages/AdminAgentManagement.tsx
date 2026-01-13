import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AgentsManagementHeader } from '@/components/admin/agents/AgentsManagementHeader';
import { AgentsManagementStats } from '@/components/admin/agents/AgentsManagementStats';
import { InvitedAgentsTable } from '@/components/admin/agents/InvitedAgentsTable';
import { PendingAgentsTable } from '@/components/admin/agents/PendingAgentsTable';
import { ActiveAgentsTable } from '@/components/admin/agents/ActiveAgentsTable';
import { SuspendedAgentsTable } from '@/components/admin/agents/SuspendedAgentsTable';
import { QueryErrorBoundary } from '@/components/common/QueryErrorBoundary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export default function AdminAgentManagement() {
  const [activeTab, setActiveTab] = useState('active');
  
  // We need to pass filters to header for export functionality
  const [currentFilters, setCurrentFilters] = useState({
    statusFilter: 'all',
    searchTerm: '',
    accessLevelFilter: 'all',
    commissionFilter: 'all',
    onboardingFilter: 'all',
    joinDateFilter: null as { from?: Date; to?: Date } | null
  });

  // Fetch counts for tab badges
  const { data: counts } = useQuery({
    queryKey: ['agents', 'management', 'tab-counts'],
    queryFn: async () => {
      const [invitedResult, pendingResult, activeResult, suspendedResult] = await Promise.all([
        supabase
          .from('agent_invitations')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'agent')
          .eq('agent_status', 'pending_approval'),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'agent')
          .eq('agent_status', 'active'),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'agent')
          .eq('agent_status', 'suspended'),
      ]);

      return {
        invited: invitedResult.count || 0,
        pending: pendingResult.count || 0,
        active: activeResult.count || 0,
        suspended: suspendedResult.count || 0,
      };
    },
    staleTime: 30000,
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <AgentsManagementHeader currentFilters={currentFilters} />
        <QueryErrorBoundary>
          <AgentsManagementStats />
        </QueryErrorBoundary>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="invited" className="gap-2">
              Invited
              {counts?.invited !== undefined && counts.invited > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                  {counts.invited}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-2">
              Pending
              {counts?.pending !== undefined && counts.pending > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs bg-amber-100 text-amber-700">
                  {counts.pending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-2">
              Active
              {counts?.active !== undefined && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                  {counts.active}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="suspended" className="gap-2">
              Suspended
              {counts?.suspended !== undefined && counts.suspended > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs bg-destructive/10 text-destructive">
                  {counts.suspended}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="invited">
            <QueryErrorBoundary>
              <InvitedAgentsTable />
            </QueryErrorBoundary>
          </TabsContent>
          
          <TabsContent value="pending">
            <QueryErrorBoundary>
              <PendingAgentsTable />
            </QueryErrorBoundary>
          </TabsContent>
          
          <TabsContent value="active">
            <QueryErrorBoundary>
              <ActiveAgentsTable />
            </QueryErrorBoundary>
          </TabsContent>
          
          <TabsContent value="suspended">
            <QueryErrorBoundary>
              <SuspendedAgentsTable />
            </QueryErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
