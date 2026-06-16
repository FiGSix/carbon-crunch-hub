import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useMutation } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Building,
  Calendar,
  CheckCircle2,
  Copy,
  Info,
  Mail,
  RefreshCw,
  Shield,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCacheInvalidation } from '@/hooks/query/useCacheInvalidation';
import { createNotification } from '@/services/notificationService';
import { getDefaultCommissionDescription } from '@/utils/admin/commissionHelpers';
import { AgentData } from './types';
import { renderStatusBadge } from './statusBadge';

interface AgentManageDrawerProps {
  agent: AgentData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const tierRate = (portfolioKwp: number) => (portfolioKwp >= 15000 ? 7 : 4);

export function AgentManageDrawer({ agent, open, onOpenChange }: AgentManageDrawerProps) {
  const { toast } = useToast();
  const { invalidateAgentManagement } = useCacheInvalidation();

  const [useDefaultRate, setUseDefaultRate] = useState(true);
  const [customRate, setCustomRate] = useState<string>('');
  const [confirmUpgradeOpen, setConfirmUpgradeOpen] = useState(false);
  const [confirmCancelInviteOpen, setConfirmCancelInviteOpen] = useState(false);

  useEffect(() => {
    if (!agent) return;
    if (agent.commission_override !== null && agent.commission_override !== undefined) {
      setUseDefaultRate(false);
      setCustomRate(String(agent.commission_override));
    } else {
      setUseDefaultRate(true);
      setCustomRate('');
    }
  }, [agent]);

  const commissionMutation = useMutation({
    mutationFn: async (value: number | null) => {
      if (!agent) return;
      const { error } = await supabase
        .from('profiles')
        .update({ commission_override: value })
        .eq('id', agent.agent_id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidateAgentManagement();
      toast({ title: 'Commission updated' });
    },
    onError: (e: Error) =>
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      if (!agent) return;
      const wasPending = agent.agent_status === 'pending_approval';
      const { error } = await supabase
        .from('profiles')
        .update({ agent_status: status })
        .eq('id', agent.agent_id);
      if (error) throw error;

      if (status === 'active' && wasPending) {
        await createNotification({
          userId: agent.agent_id,
          title: 'Account Approved!',
          message:
            'Your agent account has been approved. You can now start creating proposals and managing clients.',
          type: 'success',
          relatedType: 'agent_approval',
          relatedId: agent.agent_id,
        });
        try {
          await supabase.functions.invoke('send-agent-approval-email', {
            body: { agentId: agent.agent_id },
          });
        } catch {
          /* non-blocking */
        }
      }
    },
    onSuccess: async () => {
      await invalidateAgentManagement();
      toast({ title: 'Status updated' });
    },
    onError: (e: Error) =>
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      if (!agent) return;
      const { error } = await supabase.rpc('upgrade_agent_to_super_partner', {
        p_agent_id: agent.agent_id,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidateAgentManagement();
      toast({
        title: 'Agent upgraded',
        description: 'They now appear under Super Partners.',
      });
      onOpenChange(false);
    },
    onError: (e: Error) =>
      toast({ title: 'Upgrade failed', description: e.message, variant: 'destructive' }),
  });

  const resendInviteMutation = useMutation({
    mutationFn: async () => {
      if (!agent) return;
      const [firstName, ...rest] = (agent.agent_name || '').split(' ');
      const { error } = await supabase.functions.invoke('send-agent-invitation', {
        body: {
          email: agent.agent_email,
          firstName: firstName || undefined,
          lastName: rest.join(' ') || undefined,
          companyName: agent.company_name || undefined,
          resend: true,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => toast({ title: 'Invitation resent' }),
    onError: (e: Error) =>
      toast({ title: 'Resend failed', description: e.message, variant: 'destructive' }),
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async () => {
      if (!agent?.invitation_id) return;
      const { error } = await supabase
        .from('agent_invitations')
        .delete()
        .eq('id', agent.invitation_id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidateAgentManagement();
      toast({ title: 'Invitation cancelled' });
      onOpenChange(false);
    },
    onError: (e: Error) =>
      toast({ title: 'Cancel failed', description: e.message, variant: 'destructive' }),
  });

  if (!agent) return null;

  const isInvitation = !!agent.is_invitation;
  const portfolioMWp = (agent.portfolio_size_kwp || 0) / 1000;
  const currentTier = tierRate(agent.portfolio_size_kwp || 0);
  const overrideActive =
    agent.commission_override !== null && agent.commission_override !== undefined;

  const handleSaveCommission = () => {
    if (useDefaultRate) {
      commissionMutation.mutate(null);
    } else {
      const v = parseFloat(customRate);
      if (isNaN(v) || v < 0 || v > 100) {
        toast({ title: 'Invalid rate', description: 'Enter a value 0–100', variant: 'destructive' });
        return;
      }
      commissionMutation.mutate(v);
    }
  };

  const copyInviteLink = () => {
    if (!agent.invitation_token) return;
    const link = `${window.location.origin}/agent-invitation/${agent.invitation_token}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Invitation link copied' });
  };

  const renderInvitationDrawer = () => (
    <Tabs defaultValue="overview" className="mt-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="manage">Manage</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <Label className="text-muted-foreground">Name</Label>
            <p className="font-medium">{agent.agent_name || '—'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Email</Label>
            <p className="font-medium break-all">{agent.agent_email}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Company</Label>
            <p className="font-medium">{agent.company_name || '—'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Invited by</Label>
            <p className="font-medium break-all">{agent.invited_by_email || '—'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Expires</Label>
            <p className="font-medium">
              {agent.invitation_expires_at
                ? format(new Date(agent.invitation_expires_at), 'MMM d, yyyy')
                : '—'}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Status</Label>
            <div>{renderStatusBadge(agent)}</div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="manage" className="space-y-3 pt-4">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => resendInviteMutation.mutate()}
          disabled={resendInviteMutation.isPending}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Resend Invitation
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={copyInviteLink}
          disabled={!agent.invitation_token}
        >
          <Copy className="h-4 w-4 mr-2" />
          Copy Invitation Link
        </Button>
        <Button
          variant="destructive"
          className="w-full justify-start"
          onClick={() => setConfirmCancelInviteOpen(true)}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel Invitation
        </Button>

        <AlertDialog open={confirmCancelInviteOpen} onOpenChange={setConfirmCancelInviteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this invitation?</AlertDialogTitle>
              <AlertDialogDescription>
                The recipient will no longer be able to use this invitation link.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep invitation</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => cancelInviteMutation.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Cancel invitation
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TabsContent>
    </Tabs>
  );

  const renderAgentDrawer = () => {
    const statusButtons = [
      { label: 'Set Active', value: 'active' },
      { label: 'Set Inactive', value: 'inactive' },
      { label: 'Suspend', value: 'suspended' },
      { label: 'Mark Pending', value: 'pending_approval' },
    ];
    const isPending = agent.agent_status === 'pending_approval';

    return (
      <Tabs defaultValue="overview" className="mt-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="manage">Manage</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-6 pt-4">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Personal Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <User className="h-3 w-3" />Full Name
                </div>
                <p className="font-medium">{agent.agent_name || '—'}</p>
              </div>
              <div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Mail className="h-3 w-3" />Email
                </div>
                <p className="font-medium break-all">{agent.agent_email}</p>
              </div>
              {agent.company_name && (
                <div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Building className="h-3 w-3" />Company
                  </div>
                  <p className="font-medium">{agent.company_name}</p>
                </div>
              )}
              <div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3 w-3" />Join Date
                </div>
                <p className="font-medium">
                  {agent.join_date
                    ? format(new Date(agent.join_date), 'MMM d, yyyy')
                    : 'Not available'}
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Account Status</h3>
            <div>{renderStatusBadge(agent)}</div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />Performance Metrics
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-muted p-3">
                <div className="text-xl font-bold">{agent.total_proposals}</div>
                <div className="text-xs text-muted-foreground">Total Proposals</div>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <div className="text-xl font-bold text-blue-600">{agent.active_proposals}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <div className="text-xl font-bold text-green-600">{agent.signed_proposals}</div>
                <div className="text-xs text-muted-foreground">Signed</div>
              </div>
            </div>
            {agent.total_proposals > 0 && (
              <p className="text-xs text-muted-foreground">
                Success Rate:{' '}
                {Math.round((agent.signed_proposals / agent.total_proposals) * 100)}%
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Commission Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <Label className="text-muted-foreground">Commission Rate</Label>
                <div className="mt-1">
                  {overrideActive ? (
                    <Badge variant="outline">{agent.commission_override}% (Override)</Badge>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="inline-flex items-center gap-1 cursor-help">
                            <Badge variant="secondary">{currentTier}%</Badge>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">Under 15 MWp: 4% / 15 MWp+: 7%</p>
                          <p className="text-xs mt-1">
                            Current portfolio: {portfolioMWp.toFixed(2)} MWp
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Total Earnings</Label>
                <p className="font-semibold text-green-600">
                  {formatCurrency(agent.total_commission)}
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Recent Activity</h3>
            <p className="text-sm text-muted-foreground">
              {agent.last_active_at
                ? format(new Date(agent.last_active_at), "MMM d, yyyy 'at' h:mm a")
                : 'Never logged in'}
            </p>
          </section>
        </TabsContent>

        {/* MANAGE */}
        <TabsContent value="manage" className="space-y-6 pt-4">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Commission Override</h3>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={useDefaultRate}
                  onChange={() => setUseDefaultRate(true)}
                />
                Use default commission rate
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">{currentTier}%</Badge>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">{getDefaultCommissionDescription()}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={!useDefaultRate}
                  onChange={() => setUseDefaultRate(false)}
                />
                Custom commission rate
              </label>

              {!useDefaultRate && (
                <div className="flex items-center gap-2 pl-6">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    className="w-28"
                    value={customRate}
                    onChange={(e) => setCustomRate(e.target.value)}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              )}
            </div>

            <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 p-3 text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <p>Under 15 MWp: <strong>4%</strong></p>
              <p>15 MWp+: <strong>7%</strong></p>
              <p>Overrides apply to future proposals only.</p>
            </div>

            <Button
              size="sm"
              onClick={handleSaveCommission}
              disabled={commissionMutation.isPending}
            >
              Save Changes
            </Button>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Account Status</h3>
            <div className="grid grid-cols-2 gap-2">
              {isPending && (
                <Button
                  size="sm"
                  className="col-span-2 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => statusMutation.mutate('active')}
                  disabled={statusMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve Agent
                </Button>
              )}
              {statusButtons
                .filter((b) => !(isPending && b.value === 'active'))
                .map((b) => (
                  <Button
                    key={b.value}
                    size="sm"
                    variant="outline"
                    disabled={
                      agent.agent_status === b.value || statusMutation.isPending
                    }
                    onClick={() => statusMutation.mutate(b.value)}
                  >
                    {b.label}
                  </Button>
                ))}
            </div>
          </section>

          {!isPending && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Role Upgrade</h3>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setConfirmUpgradeOpen(true)}
              >
                <Shield className="h-4 w-4 mr-2" />
                Upgrade to Super Partner
              </Button>

              <AlertDialog open={confirmUpgradeOpen} onOpenChange={setConfirmUpgradeOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Upgrade to Super Partner?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently change their role. They will appear under Super
                      Partners and be removed from this list.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => upgradeMutation.mutate()}>
                      Upgrade
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </section>
          )}
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[560px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle asChild>
            <div className="space-y-1 text-left">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{agent.agent_name || agent.agent_email}</span>
                {renderStatusBadge(agent)}
              </div>
              {agent.company_name && (
                <p className="text-sm text-muted-foreground font-normal">
                  {agent.company_name}
                </p>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>

        {isInvitation ? renderInvitationDrawer() : renderAgentDrawer()}
      </SheetContent>
    </Sheet>
  );
}
