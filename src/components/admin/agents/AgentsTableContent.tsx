import { useState } from 'react';
import { SectionLoading } from '@/components/ui/loading-states';
import { format } from 'date-fns';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AgentStatusDropdown } from './AgentStatusDropdown';
import { CommissionOverrideDialog } from './CommissionOverrideDialog';
import { AgentDetailsDialog } from './AgentDetailsDialog';
import { AgentData } from './AgentsManagementTable';
import { MoreHorizontal, Eye, TrendingUp, Users, Award, CheckCircle, Info, Mail, X, Copy } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getAgentDisplayCommission, getDefaultCommissionDescription } from '@/utils/admin/commissionHelpers';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AgentsTableContentProps {
  data: AgentData[];
  isLoading: boolean;
  error: any;
  selectedAgents: string[];
  onAgentSelection: (agentId: string, isSelected: boolean) => void;
  onSelectAllAgents: (isSelected: boolean) => void;
  onUpdateStatus: (agentId: string, status: string) => void;
  onUpdateCommission: (agentId: string, commission: number | null) => void;
  onResendInvitation: (invitationId: string) => void;
  onCancelInvitation: (invitationId: string) => void;
  isUpdating: boolean;
  isInvitationActionPending: boolean;
}

export function AgentsTableContent({
  data,
  isLoading,
  error,
  selectedAgents,
  onAgentSelection,
  onSelectAllAgents,
  onUpdateStatus,
  onUpdateCommission,
  onResendInvitation,
  onCancelInvitation,
  isUpdating,
  isInvitationActionPending
}: AgentsTableContentProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
  const [showCommissionDialog, setShowCommissionDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const getStatusBadge = (status: string, expiresAt?: string) => {
    const isExpired = expiresAt && new Date(expiresAt) < new Date();
    
    const variants = {
      active: { variant: 'default' as const, label: 'Active', className: '' },
      inactive: { variant: 'secondary' as const, label: 'Inactive', className: '' },
      suspended: { variant: 'destructive' as const, label: 'Suspended', className: '' },
      pending_approval: { 
        variant: 'outline' as const, 
        label: 'Pending Approval',
        className: 'border-yellow-500 text-yellow-600 animate-pulse'
      },
      invited: {
        variant: 'outline' as const,
        label: isExpired ? 'Expired' : 'Invited',
        className: isExpired ? 'border-red-500 text-red-600' : 'border-amber-500 text-amber-600'
      }
    };
    
    const config = variants[status as keyof typeof variants] || variants.inactive;
    return (
      <Badge 
        variant={config.variant}
        className={config.className}
      >
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <SectionLoading 
          title="Loading agents data..."
          rows={5}
          className="p-8"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 p-8 text-center">
        <p className="text-destructive mb-2">Failed to load agents data</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="rounded-md border p-8 text-center">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-medium mb-2">No agents found</p>
        <p className="text-muted-foreground">Try adjusting your search criteria</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={data.length > 0 && selectedAgents.length === data.length}
                  onCheckedChange={onSelectAllAgents}
                  aria-label="Select all agents"
                />
              </TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Performance</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((agent) => (
              <TableRow key={agent.agent_id}>
                <TableCell>
                  <Checkbox
                    checked={selectedAgents.includes(agent.agent_id)}
                    onCheckedChange={(checked) => onAgentSelection(agent.agent_id, !!checked)}
                    aria-label={`Select ${agent.agent_name}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{agent.agent_name}</div>
                    <div className="text-sm text-muted-foreground">{agent.agent_email}</div>
                    {agent.company_name && (
                      <div className="text-xs text-muted-foreground">{agent.company_name}</div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-2">
                    {getStatusBadge(agent.agent_status, agent.invitation_expires_at)}
                    {agent.is_invitation ? (
                      <div className="text-xs text-muted-foreground">
                        Invited {agent.invited_by_email && `by ${agent.invited_by_email}`}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        {agent.access_level} access
                      </div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  {agent.is_invitation ? (
                    <div className="text-sm text-muted-foreground">N/A</div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-3 w-3" />
                        {agent.total_proposals} total
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {agent.active_proposals} active, {agent.signed_proposals} signed
                      </div>
                    </div>
                  )}
                </TableCell>
                
                <TableCell>
                  {agent.is_invitation ? (
                    <div className="text-sm text-muted-foreground">N/A</div>
                  ) : (
                    <div className="space-y-1">
                      {agent.commission_override ? (
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs font-medium">
                            {agent.commission_override}% override
                          </Badge>
                        </div>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground cursor-help">
                                <span>Tier-based rate</span>
                                <Info className="h-3 w-3" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs font-medium mb-1">Dynamic Commission Tiers:</p>
                              <p className="text-xs">{getDefaultCommissionDescription()}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <div className="text-xs font-medium">
                        {formatCurrency(agent.total_commission)} earned
                      </div>
                    </div>
                  )}
                </TableCell>
                
                <TableCell>
                  {agent.is_invitation && agent.invitation_expires_at ? (
                    <div className="text-sm">
                      <div className="text-xs text-muted-foreground mb-1">Expires:</div>
                      <div>{format(new Date(agent.invitation_expires_at), 'MMM d, yyyy')}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(agent.invitation_expires_at), 'h:mm a')}
                      </div>
                    </div>
                  ) : agent.last_active_at ? (
                    <div className="text-sm">
                      <div className="space-y-1">
                        <div>{format(new Date(agent.last_active_at), 'MMM d, yyyy')}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(agent.last_active_at), 'h:mm a')}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Never</span>
                  )}
                </TableCell>
                
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      
                      {/* Invitation-specific actions */}
                      {agent.is_invitation && agent.invitation_id ? (
                        <>
                          <DropdownMenuItem 
                            onClick={() => onResendInvitation(agent.invitation_id!)}
                            disabled={isInvitationActionPending}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Resend Invitation
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              const inviteUrl = `${window.location.origin}/register?token=${agent.invitation_id}`;
                              navigator.clipboard.writeText(inviteUrl);
                              alert('Invitation link copied to clipboard!');
                            }}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Invitation Link
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => onCancelInvitation(agent.invitation_id!)}
                            disabled={isInvitationActionPending}
                            className="text-destructive"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel Invitation
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          {/* Show Approve option FIRST if status is pending_approval */}
                          {agent.agent_status === 'pending_approval' && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => onUpdateStatus(agent.agent_id, 'active')}
                                className="text-green-600 font-medium"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve Agent
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedAgent(agent);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedAgent(agent);
                              setShowCommissionDialog(true);
                            }}
                          >
                            <Award className="h-4 w-4 mr-2" />
                            Set Commission
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AgentStatusDropdown
                            currentStatus={agent.agent_status}
                            onStatusChange={(status) => onUpdateStatus(agent.agent_id, status)}
                            disabled={isUpdating}
                          />
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedAgent && (
        <>
          <CommissionOverrideDialog
            open={showCommissionDialog}
            onOpenChange={setShowCommissionDialog}
            agent={selectedAgent}
            onSave={(commission) => {
              onUpdateCommission(selectedAgent.agent_id, commission);
              setShowCommissionDialog(false);
              setSelectedAgent(null);
            }}
          />
          
          <AgentDetailsDialog
            open={showDetailsDialog}
            onOpenChange={setShowDetailsDialog}
            agent={selectedAgent}
          />
        </>
      )}
    </>
  );
}