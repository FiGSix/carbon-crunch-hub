import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import {
  getUserCompany,
  getCompanyMembers,
  getPendingApprovals,
  approveMember,
  declineMember,
  inviteMember,
  isUserTeamLead,
  getPendingTeamInvitations,
  cancelTeamInvitation,
  resendTeamInvitation
} from '@/lib/supabase/company/companyOperations';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function useCompanyManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get user's company
  const { data: companyData, isLoading: isLoadingCompany } = useQuery({
    queryKey: ['user-company', user?.id],
    queryFn: () => getUserCompany(user!.id),
    enabled: !!user,
  });

  const company = companyData?.data?.companies;
  const membershipData = companyData?.data;

  // Get company members
  const { data: membersData, isLoading: isLoadingMembers } = useQuery({
    queryKey: ['company-members', company?.id],
    queryFn: () => getCompanyMembers(company!.id),
    enabled: !!company,
  });

  // Get pending approvals
  const { data: pendingData } = useQuery({
    queryKey: ['pending-approvals', company?.id],
    queryFn: () => getPendingApprovals(company!.id),
    enabled: !!company,
  });

  // Get pending team invitations
  const { data: pendingInvitations } = useQuery({
    queryKey: ['pending-team-invitations', company?.id],
    queryFn: () => getPendingTeamInvitations(company!.id),
    enabled: !!company,
  });

  // Check if user is team lead
  const { data: isTeamLead } = useQuery({
    queryKey: ['is-team-lead', user?.id],
    queryFn: () => isUserTeamLead(user!.id),
    enabled: !!user,
  });

  // Approve member mutation
  const approveMutation = useMutation({
    mutationFn: (memberId: string) => approveMember(memberId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-members'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      toast.success('Member approved successfully');
    },
    onError: () => {
      toast.error('Failed to approve member');
    },
  });

  // Decline member mutation
  const declineMutation = useMutation({
    mutationFn: (memberId: string) => declineMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-members'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      toast.success('Member request declined');
    },
    onError: () => {
      toast.error('Failed to decline member');
    },
  });

  // Invite member mutation
  const inviteMutation = useMutation({
    mutationFn: (userId: string) => inviteMember(company!.id, userId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-members'] });
      toast.success('Invitation sent successfully');
    },
    onError: () => {
      toast.error('Failed to send invitation');
    },
  });

  // Invite team member by email mutation
  const inviteByEmailMutation = useMutation({
    mutationFn: async (data: { email: string; firstName?: string; lastName?: string }) => {
      const { data: result, error } = await supabase.functions.invoke('send-team-invitation', {
        body: data,
      });
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-team-invitations'] });
      toast.success('Team invitation sent successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send team invitation');
    },
  });

  // Cancel team invitation mutation
  const cancelInvitationMutation = useMutation({
    mutationFn: (invitationId: string) => cancelTeamInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-team-invitations'] });
      toast.success('Invitation cancelled');
    },
    onError: () => {
      toast.error('Failed to cancel invitation');
    },
  });

  // Resend team invitation mutation
  const resendInvitationMutation = useMutation({
    mutationFn: (invitationId: string) => resendTeamInvitation(invitationId),
    onSuccess: () => {
      toast.success('Invitation resent successfully');
    },
    onError: () => {
      toast.error('Failed to resend invitation');
    },
  });

  return {
    company,
    membershipData,
    members: membersData?.data || [],
    pendingApprovals: pendingData?.data || [],
    pendingInvitations: pendingInvitations?.data || [],
    isTeamLead: isTeamLead || false,
    isLoading: isLoadingCompany || isLoadingMembers,
    approveMember: approveMutation.mutate,
    declineMember: declineMutation.mutate,
    inviteMember: inviteMutation.mutate,
    inviteByEmail: inviteByEmailMutation.mutate,
    cancelInvitation: cancelInvitationMutation.mutate,
    resendInvitation: resendInvitationMutation.mutate,
    isApproving: approveMutation.isPending,
    isDeclining: declineMutation.isPending,
    isInviting: inviteByEmailMutation.isPending,
    isCancelling: cancelInvitationMutation.isPending,
    isResending: resendInvitationMutation.isPending,
  };
}
