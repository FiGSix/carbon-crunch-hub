import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useAdminCompanyManagement } from '@/hooks/useAdminCompanyManagement';
import { formatDistanceToNow } from 'date-fns';
import { Crown, Users, Clock, CheckCircle, XCircle, ArrowDown, ArrowUp, Trash2, Loader2, PenLine, Pencil, Check, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface CompanyManagementDialogProps {
  companyId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompanyManagementDialog({
  companyId,
  open,
  onOpenChange,
}: CompanyManagementDialogProps) {
  const { toast } = useToast();
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [commissionOverride, setCommissionOverride] = useState<string>('');
  const [companySignedKwp, setCompanySignedKwp] = useState<number>(0);
  const [savingOverride, setSavingOverride] = useState(false);
  const [overrideLoaded, setOverrideLoaded] = useState(false);
  
  const {
    companyDetails,
    isLoadingDetails,
    promoteToTeamLead,
    demoteFromTeamLead,
    removeMember,
    approveMember,
    declineMember,
    toggleSigningPermission,
    updateCompany,
    isPromoting,
    isDemoting,
    isRemoving,
    isApproving,
    isDeclining,
    isTogglingSign,
  } = useAdminCompanyManagement(companyId || undefined);

  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || '');
    };
    fetchUserId();
  }, []);

  // Reset edit state when company changes
  useEffect(() => {
    if (companyDetails) {
      setEditedName(companyDetails.company_name);
      setIsEditingName(false);
    }
  }, [companyDetails]);

  const handleSaveName = () => {
    if (!companyId || !editedName.trim()) return;
    updateCompany({
      companyId,
      updates: { company_name: editedName.trim() },
      companyType: companyDetails?.companyType || 'agent',
    });
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setEditedName(companyDetails?.company_name || '');
    setIsEditingName(false);
  };

  // Load company commission override + company-signed MWp (agent companies only)
  useEffect(() => {
    let cancelled = false;
    setOverrideLoaded(false);
    if (!companyId || companyDetails?.companyType === 'client') {
      setCommissionOverride('');
      setCompanySignedKwp(0);
      return;
    }
    (async () => {
      const [{ data: co }, { data: props }] = await Promise.all([
        (supabase as any).from('companies').select('commission_override').eq('id', companyId).maybeSingle(),
        (supabase as any)
          .from('proposals')
          .select('system_size_kwp')
          .eq('company_id', companyId)
          .not('signed_at', 'is', null)
          .is('deleted_at', null),
      ]);
      if (cancelled) return;
      setCommissionOverride(co?.commission_override == null ? '' : String(co.commission_override));
      setCompanySignedKwp((props ?? []).reduce((s: number, r: any) => s + Number(r.system_size_kwp ?? 0), 0));
      setOverrideLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [companyId, companyDetails?.companyType]);

  const saveCommissionOverride = async (value: number | null) => {
    if (!companyId) return;
    setSavingOverride(true);
    const { error } = await (supabase as any)
      .from('companies')
      .update({ commission_override: value })
      .eq('id', companyId);
    setSavingOverride(false);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    setCommissionOverride(value == null ? '' : String(value));
    toast({
      title: value == null
        ? 'Override cleared — company will use MWp tier'
        : 'Rate applied — affects all future proposals from this company',
    });
  };

  if (!companyId) return null;

  const companyType = companyDetails?.companyType || 'agent';
  const isClientCompany = companyType === 'client';
  
  // Labels based on company type
  const leadLabel = isClientCompany ? 'Account Admin' : 'Team Lead';
  const leadsLabel = isClientCompany ? 'Account Admins' : 'Team Leads';

  const teamLeads = companyDetails?.members.filter(m => m.role === 'team_lead') || [];
  const regularMembers = companyDetails?.members.filter(m => m.role === 'member') || [];
  const isAnyOperationPending = isPromoting || isDemoting || isRemoving || isApproving || isDeclining || isTogglingSign;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            Company Management
            {isClientCompany && (
              <Badge variant="secondary" className="ml-2">Client Company</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {isAnyOperationPending && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
            <div className="flex items-center gap-2 text-primary">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="font-medium">Processing...</span>
            </div>
          </div>
        )}

        {isLoadingDetails ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading company details...</div>
          </div>
        ) : companyDetails ? (
          <ScrollArea className="h-[calc(90vh-120px)]">
            <div className="space-y-6 pr-4">
              {/* Company Overview */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {isEditingName ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="text-lg font-semibold h-9"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                      <Button size="sm" variant="ghost" onClick={handleSaveName} disabled={!editedName.trim()}>
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold">{companyDetails.company_name}</h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditingName(true)}
                        className="h-7 w-7 p-0"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
                {companyDetails.email_domain && (
                  <p className="text-sm text-muted-foreground">Domain: {companyDetails.email_domain}</p>
                )}
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{companyDetails.total_members} members</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    <span>{companyDetails.team_leads} {leadsLabel.toLowerCase()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{companyDetails.pending} pending</span>
                  </div>
                </div>
              </div>

              {!isClientCompany && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-semibold">Partner commission rate override</h4>
                    <p className="text-sm text-muted-foreground">
                      When set, all partners in this company earn this fixed rate regardless of
                      their MWp tier. Leave blank to use the standard 4% / 7% tier.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        placeholder="e.g. 5"
                        className="w-32"
                        value={commissionOverride}
                        onChange={(e) => setCommissionOverride(e.target.value)}
                        disabled={!overrideLoaded || savingOverride}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (commissionOverride.trim() === '') {
                            saveCommissionOverride(null);
                            return;
                          }
                          const v = Number(commissionOverride);
                          if (Number.isNaN(v) || v < 0 || v > 100) {
                            toast({
                              title: 'Invalid rate',
                              description: 'Enter a value between 0 and 100.',
                              variant: 'destructive',
                            });
                            return;
                          }
                          saveCommissionOverride(v);
                        }}
                        disabled={savingOverride}
                      >
                        Save
                      </Button>
                      {commissionOverride !== '' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => saveCommissionOverride(null)}
                          disabled={savingOverride}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {commissionOverride !== '' && !Number.isNaN(Number(commissionOverride))
                        ? `Effective rate: ${Number(commissionOverride)}% (override)`
                        : `Effective rate: ${companySignedKwp < 15000 ? 4 : 7}% by MWp tier (${(companySignedKwp / 1000).toFixed(2)} MWp signed)`}
                    </p>
                  </div>
                </>
              )}

              <Separator />


              {/* Team Leads / Account Admins Section */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-600" />
                  {leadsLabel} ({teamLeads.length})
                </h4>
                {teamLeads.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No {leadsLabel.toLowerCase()} yet</p>
                ) : (
                  <div className="space-y-2">
                    {teamLeads.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {member.profile?.first_name?.[0]}
                              {member.profile?.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {member.profile?.first_name} {member.profile?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {member.profile?.email}
                            </p>
                            {isClientCompany && (member as any).can_sign_agreements && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                <PenLine className="h-3 w-3 mr-1" />
                                Can Sign
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isClientCompany && (
                            <div className="flex items-center gap-2 mr-4">
                              <span className="text-xs text-muted-foreground">Can Sign</span>
                              <Switch
                                checked={(member as any).can_sign_agreements || false}
                                onCheckedChange={(checked) => 
                                  toggleSigningPermission({ memberId: member.id, canSign: checked })
                                }
                                disabled={isAnyOperationPending}
                              />
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => demoteFromTeamLead({ memberId: member.id, userId: currentUserId, companyType })}
                            disabled={isAnyOperationPending || teamLeads.length === 1}
                          >
                            <ArrowDown className="h-4 w-4 mr-1" />
                            Demote
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeMember({ memberId: member.id, companyType })}
                            disabled={isAnyOperationPending || teamLeads.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Regular Members Section */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Members ({regularMembers.length})
                </h4>
                {regularMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No members yet</p>
                ) : (
                  <div className="space-y-2">
                    {regularMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {member.profile?.first_name?.[0]}
                              {member.profile?.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {member.profile?.first_name} {member.profile?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {member.profile?.email}
                            </p>
                            {isClientCompany && (member as any).can_sign_agreements && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                <PenLine className="h-3 w-3 mr-1" />
                                Can Sign
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isClientCompany && (
                            <div className="flex items-center gap-2 mr-4">
                              <span className="text-xs text-muted-foreground">Can Sign</span>
                              <Switch
                                checked={(member as any).can_sign_agreements || false}
                                onCheckedChange={(checked) => 
                                  toggleSigningPermission({ memberId: member.id, canSign: checked })
                                }
                                disabled={isAnyOperationPending}
                              />
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => promoteToTeamLead({ memberId: member.id, userId: currentUserId, companyType })}
                            disabled={isAnyOperationPending}
                          >
                            <ArrowUp className="h-4 w-4 mr-1" />
                            Promote
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeMember({ memberId: member.id, companyType })}
                            disabled={isAnyOperationPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Approvals Section */}
              {companyDetails.pendingApprovals.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-600" />
                      Pending Approvals ({companyDetails.pendingApprovals.length})
                    </h4>
                    <div className="space-y-2">
                      {companyDetails.pendingApprovals.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>
                                {member.profile?.first_name?.[0]}
                                {member.profile?.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {member.profile?.first_name} {member.profile?.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {member.profile?.email}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Requested {formatDistanceToNow(new Date(member.invited_at))} ago
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => approveMember({ memberId: member.id, userId: currentUserId, companyType })}
                              disabled={isAnyOperationPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => declineMember({ memberId: member.id, companyType })}
                              disabled={isAnyOperationPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Company not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
