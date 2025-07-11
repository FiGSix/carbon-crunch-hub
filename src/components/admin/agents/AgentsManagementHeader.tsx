import { useState } from 'react';
import { Users, UserPlus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AgentCreationDialog } from './AgentCreationDialog';
import { ExportDialog } from './export/ExportDialog';

interface AgentsManagementHeaderProps {
  currentFilters: {
    statusFilter: string;
    searchTerm: string;
    accessLevelFilter: string;
    commissionFilter: string;
    onboardingFilter: string;
    joinDateFilter: { from?: Date; to?: Date } | null;
  };
}

export function AgentsManagementHeader({ currentFilters }: AgentsManagementHeaderProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Agent Management</h1>
          <Badge variant="secondary" className="ml-2">
            Admin Only
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Manage agent accounts, permissions, and performance
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)}>
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
        <Button size="sm" onClick={() => setShowCreateDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Agent
        </Button>
      </div>
      
      <AgentCreationDialog 
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
      
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        currentFilters={currentFilters}
      />
    </div>
  );
}