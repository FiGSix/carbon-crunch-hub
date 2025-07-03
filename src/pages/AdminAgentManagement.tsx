import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AgentsManagementTable } from '@/components/admin/agents/AgentsManagementTable';
import { AgentsManagementHeader } from '@/components/admin/agents/AgentsManagementHeader';
import { AgentsManagementStats } from '@/components/admin/agents/AgentsManagementStats';

export default function AdminAgentManagement() {
  // We need to pass filters to header for export functionality
  const [currentFilters, setCurrentFilters] = useState({
    statusFilter: 'all',
    searchTerm: '',
    accessLevelFilter: 'all',
    commissionFilter: 'all',
    onboardingFilter: 'all',
    joinDateFilter: null as { from?: Date; to?: Date } | null
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <AgentsManagementHeader currentFilters={currentFilters} />
        <AgentsManagementStats />
        <AgentsManagementTable />
      </div>
    </DashboardLayout>
  );
}