import { useState } from 'react';
import { Users, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AgentInvitationDialog } from './AgentInvitationDialog';

export function PartnerManagementHeader() {
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Partner Management</h1>
          <Badge variant="secondary" className="ml-2">Admin Only</Badge>
        </div>
        <p className="text-muted-foreground">
          Manage user accounts and role assignments
        </p>
      </div>

      <Button size="sm" onClick={() => setShowInviteDialog(true)}>
        <Mail className="h-4 w-4 mr-2" />
        Invite Partner
      </Button>

      <AgentInvitationDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
      />
    </div>
  );
}
