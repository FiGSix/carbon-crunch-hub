import { Users, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function UserManagementHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <Badge variant="secondary" className="ml-2">
            <Shield className="h-3 w-3 mr-1" />
            Admin Only
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Manage user accounts and role assignments
        </p>
      </div>
    </div>
  );
}
