import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  ArrowRight,
  CheckCircle2,
  Copy,
  Pencil,
  RefreshCw,
  Shield,
  X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCacheInvalidation } from '@/hooks/query/useCacheInvalidation';
import { createNotification } from '@/services/notificationService';
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

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
    {children}
  </h3>
);

export function AgentManageDrawer({ agent, open, onOpenChange }: AgentManageDrawerProps) {
  const { toast } = useToast();
  const { invalidateAgentManagement } = useCacheInvalidation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const partnerId = agent?.agent_id ?? null;
  const isInvitation = !!agent?.is_invitation;

  const [editing, setEditing] = useState(false);
  const [editFirst, setEditFirst] = useState('');
  const [editLast, setEditLast] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [confirmUpgradeOpen, setConfirmUpgradeOpen] = useState(false);
  const [confirmCancelInviteOpen, setConfirmCancelInviteOpen] = useState(false);

  // ───────────────────── Fresh profile data on open ─────────────────────
  const { data: profileData, refetch: refetchProfile } = useQuery({
    queryKey: ['admin-partner-drawer-profile', partnerId],
    enabled: !!partnerId && open && !isInvitation,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, agent_status, last_active_at, company_name')
        .eq('id', partnerId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // ───────────────────── Fresh company membership ─────────────────────
  const { data: membership } = useQuery({
    queryKey: ['admin-partner-drawer-membership', partnerId],
    enabled: !!partnerId && open && !isInvitation,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_members')
        .select('role, created_at, company_id, companies:company_id(id, company_name, commission_override)')
        .eq('user_id', partnerId!)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  // ───────────────────── Fresh proposals (live) ─────────────────────
  const { data: proposals, refetch: refetchProposals } = useQuery({
    queryKey: ['admin-partner-drawer-proposals', partnerId],
    enabled: !!partnerId && open && !isInvitation,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select('id, system_size_kwp, signed_at, status')
        .eq('agent_id', partnerId!)
        .is('deleted_at', null);
      if (error) throw error;
      return data ?? [];
    },
  });

  // ───────────────────── Fresh earnings (live) ─────────────────────
  const { data: earnings } = useQuery({
    queryKey: ['admin-partner-drawer-earnings', partnerId],
    enabled: !!partnerId && open && !isInvitation,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_commissions')
        .select('commission_amount')
        .eq('agent_id', partnerId!);
      if (error) throw error;
      return (data ?? []).reduce((s, r: any) => s + Number(r.commission_amount ?? 0), 0);
    },
  });

  // ───────────────────── Realtime: only for the open partner ─────────────────────
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  useEffect(() => {
    if (!partnerId || !open || isInvitation) return;
    const channel = supabase
      .channel(`partner-drawer-${partnerId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${partnerId}` },
        () => {
          refetchProfile();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'proposals', filter: `agent_id=eq.${partnerId}` },
        () => {
          refetchProposals();
        },
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [partnerId, open, isInvitation, refetchProfile, refetchProposals]);

  // Sync edit form when profile loads or drawer reopens
  useEffect(() => {
    if (profileData) {
      setEditFirst(profileData.first_name ?? '');
      setEditLast(profileData.last_name ?? '');
      setEditPhone(profileData.phone ?? '');
    }
    setEditing(false);
  }, [profileData?.id, open]);

  // ─────────────────────────── Mutations ───────────────────────────
  const savePartnerMutation = useMutation({
    mutationFn: async () => {
      if (!partnerId) return;
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: editFirst.trim() || null,
          last_name: editLast.trim() || null,
          phone: editPhone.trim() || null,
        })
        .eq('id', partnerId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        invalidateAgentManagement(),
        queryClient.invalidateQueries({ queryKey: ['admin-partner-drawer-profile', partnerId] }),
      ]);
      toast({ title: 'Partner details saved' });
      setEditing(false);
    },
    onError: (e: Error) =>
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' }),
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      if (!partnerId) return;
      const wasPending = (profileData?.agent_status ?? agent?.agent_status) === 'pending_approval';
      const { error } = await supabase
        .from('profiles')
        .update({ agent_status: status })
        .eq('id', partnerId);
      if (error) throw error;

      if (status === 'active' && wasPending) {
        await createNotification({
          userId: partnerId,
          title: 'Account Approved!',
          message:
            'Your partner account has been approved. You can now start creating proposals and managing clients.',
          type: 'success',
          relatedType: 'agent_approval',
          relatedId: partnerId,
        });
        try {
          await supabase.functions.invoke('send-agent-approval-email', {
            body: { agentId: partnerId },
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
      if (!partnerId) return;
      const { error } = await supabase.rpc('upgrade_agent_to_super_partner', {
        p_agent_id: partnerId,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidateAgentManagement();
      toast({
        title: 'Partner upgraded',
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

  // ─────────────────────── Derived live stats ───────────────────────
  const stats = useMemo(() => {
    const list = proposals ?? [];
    const total = list.length;
    const signed = list.filter((p: any) => !!p.signed_at).length;
    const signedKwp = list
      .filter((p: any) => !!p.signed_at)
      .reduce((s: number, p: any) => s + Number(p.system_size_kwp ?? 0), 0);
    return { total, signed, mwp: signedKwp / 1000 };
  }, [proposals]);

  if (!agent) return null;

  const companyId = membership?.company_id ?? agent.company_id ?? null;
  const companyName = membership?.companies?.company_name ?? agent.company_name ?? null;
  const companyOverride: number | null =
    membership?.companies?.commission_override ?? agent.company_commission_override ?? null;
  const companySignedKwp = agent.company_signed_kwp ?? 0;
  const companySignedMwp = companySignedKwp / 1000;
  const tierRate = companySignedKwp >= 15000 ? 7 : 4;

  const status = profileData?.agent_status ?? agent.agent_status;
  const lastActive = profileData?.last_active_at ?? agent.last_active_at;
  const isPending = status === 'pending_approval';
  const fullName =
    [profileData?.first_name, profileData?.last_name].filter(Boolean).join(' ') ||
    agent.agent_name ||
    agent.agent_email;

  // ─────────────────────── Invitation variant ───────────────────────
  if (isInvitation) {
    const copyInviteLink = () => {
      if (!agent.invitation_token) return;
      const link = `${window.location.origin}/register?role=agent&token=${agent.invitation_token}`;
      navigator.clipboard.writeText(link);
      toast({ title: 'Invitation link copied' });
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
                <p className="text-sm text-muted-foreground font-normal break-all">
                  {agent.agent_email}
                </p>
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <section className="rounded-lg bg-muted/40 p-4 space-y-3">
              <SectionLabel>Invitation</SectionLabel>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Invited by</div>
                  <div className="font-medium break-all">{agent.invited_by_email || '—'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Expires</div>
                  <div className="font-medium">
                    {agent.invitation_expires_at
                      ? format(new Date(agent.invitation_expires_at), 'MMM d, yyyy')
                      : '—'}
                  </div>
                </div>
                {agent.company_name && (
                  <div className="col-span-2">
                    <div className="text-muted-foreground">Company</div>
                    <div className="font-medium">{agent.company_name}</div>
                  </div>
                )}
              </div>
            </section>

            <div className="space-y-2">
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
            </div>
          </div>

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
        </SheetContent>
      </Sheet>
    );
  }

  // ─────────────────────── Registered partner ───────────────────────
  const statusButtons = [
    { label: 'Set Active', value: 'active' },
    { label: 'Set Inactive', value: 'inactive' },
    { label: 'Suspend', value: 'suspended' },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[560px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle asChild>
            <div className="space-y-1 text-left">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-semibold">{fullName}</span>
                {renderStatusBadge({ ...agent, agent_status: status })}
              </div>
              {companyName && (
                <p className="text-sm text-muted-foreground font-normal">{companyName}</p>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Section 1: Partner Details (editable) */}
          <section className="rounded-lg bg-muted/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <SectionLabel>Partner Details</SectionLabel>
              {!editing ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(true)}
                  aria-label="Edit partner details"
                  className="h-7 w-7 p-0"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
            {editing ? (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">First Name</Label>
                    <Input value={editFirst} onChange={(e) => setEditFirst(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Last Name</Label>
                    <Input value={editLast} onChange={(e) => setEditLast(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input value={profileData?.email ?? agent.agent_email} readOnly disabled />
                  <p className="text-xs text-muted-foreground mt-1">
                    Email changes require account settings.
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => savePartnerMutation.mutate()}
                    disabled={savePartnerMutation.isPending}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(false);
                      setEditFirst(profileData?.first_name ?? '');
                      setEditLast(profileData?.last_name ?? '');
                      setEditPhone(profileData?.phone ?? '');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">First Name</div>
                  <div className="font-medium">{profileData?.first_name || '—'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Last Name</div>
                  <div className="font-medium">{profileData?.last_name || '—'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground text-xs">Email</div>
                  <div className="font-medium break-all">{profileData?.email ?? agent.agent_email}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground text-xs">Phone</div>
                  <div className="font-medium">{profileData?.phone || '—'}</div>
                </div>
              </div>
            )}
          </section>

          {/* Section 2: Company */}
          <section className="rounded-lg bg-muted/40 p-4 space-y-3">
            <SectionLabel>Company</SectionLabel>
            <div className="space-y-2 text-sm">
              <div>
                <div className="text-muted-foreground text-xs">Company</div>
                <div className="font-medium">{companyName || '—'}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-muted-foreground text-xs">Role</div>
                  <div className="font-medium capitalize">
                    {membership?.role?.replace(/_/g, ' ') || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Member since</div>
                  <div className="font-medium">
                    {membership?.created_at
                      ? format(new Date(membership.created_at), 'MMM d, yyyy')
                      : '—'}
                  </div>
                </div>
              </div>
              {companyId && (
                <Button
                  variant="link"
                  size="sm"
                  className="px-0 h-auto"
                  onClick={() => navigate(`/admin/companies/${companyId}`)}
                >
                  Manage company <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              )}
            </div>
          </section>

          {/* Section 3: Performance (live) */}
          <section className="rounded-lg bg-muted/40 p-4 space-y-3">
            <SectionLabel>Performance</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-md bg-background p-3">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total Proposals</div>
              </div>
              <div className="rounded-md bg-background p-3">
                <div className="text-2xl font-bold text-green-600">{stats.signed}</div>
                <div className="text-xs text-muted-foreground">Signed</div>
              </div>
              <div className="rounded-md bg-background p-3">
                <div className="text-2xl font-bold text-green-600">{stats.mwp.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">MWp Signed</div>
              </div>
            </div>
            {stats.total > 0 && (
              <p className="text-xs text-muted-foreground">
                {Math.round((stats.signed / stats.total) * 100)}% sign rate
              </p>
            )}
            <div className="text-xs text-muted-foreground pt-1 border-t border-border/50">
              Last Active:{' '}
              {lastActive ? format(new Date(lastActive), "MMM d, yyyy 'at' h:mm a") : 'Never'}
            </div>
          </section>

          {/* Section 4: Commission (read-only) */}
          <section className="rounded-lg bg-muted/40 p-4 space-y-3">
            <SectionLabel>Commission</SectionLabel>
            <div className="space-y-2">
              {companyOverride != null ? (
                <>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200"
                    >
                      {companyOverride}% — Company rate
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Managed at company level</p>
                </>
              ) : (
                <>
                  <div className="text-base font-semibold">{tierRate}% — MWp tier</div>
                  <p className="text-xs text-muted-foreground">
                    Based on {companySignedMwp.toFixed(2)} MWp signed by company
                  </p>
                </>
              )}
              <div className="pt-2">
                <div className="text-xs text-muted-foreground">Total Earnings</div>
                <div className="text-lg font-semibold text-green-600">
                  {formatCurrency(earnings ?? 0)}
                </div>
              </div>
              {companyId && (
                <Button
                  variant="link"
                  size="sm"
                  className="px-0 h-auto"
                  onClick={() => navigate(`/admin/companies/${companyId}`)}
                >
                  Adjust company rate <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              )}
            </div>
          </section>

          {/* Section 5: Account Status */}
          <section className="rounded-lg bg-muted/40 p-4 space-y-3">
            <SectionLabel>Account Status</SectionLabel>
            <div>{renderStatusBadge({ ...agent, agent_status: status })}</div>
            <div className="grid grid-cols-2 gap-2">
              {isPending && (
                <Button
                  size="sm"
                  className="col-span-2 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => statusMutation.mutate('active')}
                  disabled={statusMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve Partner
                </Button>
              )}
              {statusButtons.map((b) => (
                <Button
                  key={b.value}
                  size="sm"
                  variant="outline"
                  disabled={status === b.value || statusMutation.isPending}
                  onClick={() => statusMutation.mutate(b.value)}
                >
                  {b.label}
                </Button>
              ))}
            </div>
          </section>

          {/* Section 6: Upgrade to Super Partner */}
          {!isPending && (
            <>
              <div className="border-t border-border" />
              <section className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setConfirmUpgradeOpen(true)}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Upgrade to Super Partner
                </Button>
                <p className="text-xs text-muted-foreground">
                  Promote this partner to Super Partner. This is permanent — they will move to
                  the Super Partners section.
                </p>
              </section>
            </>
          )}
        </div>

        <AlertDialog open={confirmUpgradeOpen} onOpenChange={setConfirmUpgradeOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Upgrade to Super Partner?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently changes the partner's role. They will appear under Super
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
      </SheetContent>
    </Sheet>
  );
}
