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
import { MoreHorizontal, Eye, TrendingUp, Users, Award } from 'lucide-react';
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
  isUpdating: boolean;
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
  isUpdating
}: AgentsTableContentProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
  const [showCommissionDialog, setShowCommissionDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: 'default' as const, label: 'Active' },
      inactive: { variant: 'secondary' as const, label: 'Inactive' },
      suspended: { variant: 'destructive' as const, label: 'Suspended' },
      pending_approval: { variant: 'outline' as const, label: 'Pending' }
    };
    
    const config = variants[status as keyof typeof variants] || variants.inactive;
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
                    {getStatusBadge(agent.agent_status)}
                    <div className="text-xs text-muted-foreground">
                      {agent.access_level} access
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-3 w-3" />
                      {agent.total_proposals} total
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {agent.active_proposals} active, {agent.signed_proposals} signed
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    {agent.commission_override ? (
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          {agent.commission_override}% override
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Default rate</span>
                    )}
                    <div className="text-xs font-medium">
                      {formatCurrency(agent.total_commission)} earned
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="text-sm">
                    {agent.last_active_at ? (
                      <div className="space-y-1">
                        <div>{format(new Date(agent.last_active_at), 'MMM d, yyyy')}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(agent.last_active_at), 'h:mm a')}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </div>
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