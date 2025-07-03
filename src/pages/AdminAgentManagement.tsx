import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AgentsManagementTable } from '@/components/admin/agents/AgentsManagementTable';
import { AgentsManagementHeader } from '@/components/admin/agents/AgentsManagementHeader';
import { AgentsManagementStats } from '@/components/admin/agents/AgentsManagementStats';

export default function AdminAgentManagement() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <AgentsManagementHeader />
        <AgentsManagementStats />
        <AgentsManagementTable />
      </div>
    </DashboardLayout>
  );
}