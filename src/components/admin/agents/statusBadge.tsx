import { Badge } from '@/components/ui/badge';
import { AgentData } from './types';

export type StatusKey =
  | 'all'
  | 'invited'
  | 'pending_approval'
  | 'active'
  | 'inactive'
  | 'suspended';

export const STATUS_OPTIONS: { value: StatusKey; label: string; swatch: string }[] = [
  { value: 'all', label: 'All Status', swatch: 'bg-muted-foreground/40' },
  { value: 'invited', label: 'Invited', swatch: 'bg-amber-500' },
  { value: 'pending_approval', label: 'Pending', swatch: 'bg-amber-500 animate-pulse' },
  { value: 'active', label: 'Active', swatch: 'bg-green-500' },
  { value: 'inactive', label: 'Inactive', swatch: 'bg-muted-foreground/60' },
  { value: 'suspended', label: 'Suspended', swatch: 'bg-destructive' },
];

const isInvitationExpired = (expiresAt?: string | null) =>
  !!expiresAt && new Date(expiresAt) < new Date();

export function renderStatusBadge(agent: Pick<AgentData, 'agent_status' | 'is_invitation' | 'invitation_expires_at'>) {
  if (agent.is_invitation) {
    if (isInvitationExpired(agent.invitation_expires_at)) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
        Invited
      </Badge>
    );
  }
  switch (agent.agent_status) {
    case 'active':
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
          Active
        </Badge>
      );
    case 'pending_approval':
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 animate-pulse">
          Pending
        </Badge>
      );
    case 'suspended':
      return <Badge variant="destructive">Suspended</Badge>;
    case 'inactive':
      return <Badge variant="secondary">Inactive</Badge>;
    default:
      return <Badge variant="secondary">{agent.agent_status || '—'}</Badge>;
  }
}
