import React from 'react';
import { Users, UserPlus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function AgentsManagementHeader() {
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
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
        <Button size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Agent
        </Button>
      </div>
    </div>
  );
}