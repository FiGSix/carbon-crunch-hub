import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AgentData } from './AgentsManagementTable';
import { getAgentDisplayCommission, getDefaultCommissionDescription } from '@/utils/admin/commissionHelpers';
import { 
  User, 
  Mail, 
  Building, 
  Calendar, 
  TrendingUp, 
  DollarSign,
  CheckCircle,
  Clock,
  Info
} from 'lucide-react';

interface AgentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: AgentData;
}

export function AgentDetailsDialog({
  open,
  onOpenChange,
  agent
}: AgentDetailsDialogProps) {
  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: 'default' as const, label: 'Active' },
      inactive: { variant: 'secondary' as const, label: 'Inactive' },
      suspended: { variant: 'destructive' as const, label: 'Suspended' },
      pending_approval: { variant: 'outline' as const, label: 'Pending Approval' }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle asChild>
            <h2 className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Agent Details
            </h2>
          </DialogTitle>
          <DialogDescription>
            Complete information and performance metrics for {agent.agent_name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4" />
                  Full Name
                </div>
                <p className="text-sm text-muted-foreground pl-6">{agent.agent_name}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4" />
                  Email Address
                </div>
                <p className="text-sm text-muted-foreground pl-6">{agent.agent_email}</p>
              </div>
              
              {agent.company_name && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Building className="h-4 w-4" />
                    Company
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">{agent.company_name}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  Join Date
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  {agent.join_date ? format(new Date(agent.join_date), 'MMM d, yyyy') : 'Not available'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Account Status */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Account Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Status</label>
                <div>{getStatusBadge(agent.agent_status)}</div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Access Level</label>
                <Badge variant="outline">{agent.access_level}</Badge>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Onboarding</label>
                <div className="flex items-center gap-2">
                  {agent.onboarding_completed ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">Complete</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 text-orange-600" />
                      <span className="text-sm text-orange-600">Pending</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Performance Metrics */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{agent.total_proposals}</div>
                <div className="text-sm text-muted-foreground">Total Proposals</div>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{agent.active_proposals}</div>
                <div className="text-sm text-muted-foreground">Active Proposals</div>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">{agent.signed_proposals}</div>
                <div className="text-sm text-muted-foreground">Signed Proposals</div>
              </div>
            </div>
            
            {agent.total_proposals > 0 && (
              <div className="text-sm text-muted-foreground">
                Success Rate: {Math.round((agent.signed_proposals / agent.total_proposals) * 100)}%
              </div>
            )}
          </div>

          <Separator />

          {/* Commission Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Commission Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Commission Rate</label>
                <div>
                  {agent.commission_override ? (
                    <Badge variant="outline">
                      {agent.commission_override}% (Override)
                    </Badge>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 cursor-help">
                            <Badge variant="secondary">
                              {getAgentDisplayCommission(agent.portfolio_size_kwp, agent.commission_override)}
                            </Badge>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs font-medium mb-1">Tier-based Commission:</p>
                          <p className="text-xs">{getDefaultCommissionDescription()}</p>
                          <p className="text-xs mt-1 text-muted-foreground">
                            Current portfolio: {(agent.portfolio_size_kwp / 1000).toFixed(2)} MWp
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Total Earnings</label>
                <div className="text-lg font-semibold text-green-600">
                  {formatCurrency(agent.total_commission)}
                </div>
              </div>
            </div>
          </div>

          {/* Activity Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Recent Activity</h3>
            <div className="space-y-2">
              <label className="text-sm font-medium">Last Active</label>
              <p className="text-sm text-muted-foreground">
                {agent.last_active_at ? (
                  <>
                    {format(new Date(agent.last_active_at), 'MMM d, yyyy \'at\' h:mm a')}
                  </>
                ) : (
                  'Never logged in'
                )}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}