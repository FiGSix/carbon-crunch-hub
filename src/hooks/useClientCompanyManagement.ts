import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import {
  getClientUserCompany,
  getClientCompanyMembers,
  getClientPendingApprovals,
  approveClientMember,
  declineClientMember,
  isUserClientAccountAdmin,
  getPendingClientTeamInvitations,
  cancelClientTeamInvitation,
  removeClientTeamMember,
  updateClientMemberSigningPermission
} from '@/lib/supabase/clientCompany/clientCompanyOperations';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function useClientCompanyManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get user's client company
  const { data: companyData, isLoading: isLoadingCompany } = useQuery({
    queryKey: ['client-company', user?.id],
    queryFn: () => getClientUserCompany(user!.id),
    enabled: !!user,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const company = companyData?.data?.client_companies;
  const membershipData = companyData?.data;

  // Get company members
  const { data: membersData, isLoading: isLoadingMembers } = useQuery({
    queryKey: ['client-company-members', company?.id, user?.id],
    queryFn: () => getClientCompanyMembers(company!.id),
    enabled: !!company,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Get pending approvals
  const { data: pendingData } = useQuery({
    queryKey: ['client-pending-approvals', company?.id, user?.id],
    queryFn: () => getClientPendingApprovals(company!.id),
    enabled: !!company,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Get pending team invitations
  const { data: pendingInvitations } = useQuery({
    queryKey: ['client-pending-invitations', company?.id, user?.id],
    queryFn: () => getPendingClientTeamInvitations(company!.id),
    enabled: !!company,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Check if user is account admin
  const { data: isAccountAdmin } = useQuery({
    queryKey: ['is-client-account-admin', user?.id],
    queryFn: () => isUserClientAccountAdmin(user!.id),
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Approve member mutation
  const approveMutation = useMutation({
    mutationFn: (memberId: string) => approveClientMember(memberId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-company-members'] });
      queryClient.invalidateQueries({ queryKey: ['client-pending-approvals'] });
      toast.success('Member approved successfully');
    },
    onError: () => {
      toast.error('Failed to approve member');
    },
  });

  // Decline member mutation
  const declineMutation = useMutation({
    mutationFn: (memberId: string) => declineClientMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-company-members'] });
      queryClient.invalidateQueries({ queryKey: ['client-pending-approvals'] });
      toast.success('Member request declined');
    },
    onError: () => {
      toast.error('Failed to decline member');
    },
  });

  // Invite team member by email mutation
  const inviteByEmailMutation = useMutation({
    mutationFn: async (data: { email: string; firstName?: string; lastName?: string }) => {
      const { data: result, error } = await supabase.functions.invoke('send-client-team-invitation', {
        body: data,
      });
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-pending-invitations'] });
      toast.success('Team invitation sent successfully');
    },
    onError: (error: any) => {
      const errorMessage = error?.context?.body?.error || error?.context?.error || error?.message || 'Failed to send team invitation';
      toast.error(errorMessage);
    },
  });

  // Cancel invitation mutation
  const cancelInvitationMutation = useMutation({
    mutationFn: (invitationId: string) => cancelClientTeamInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-pending-invitations'] });
      toast.success('Invitation cancelled');
    },
    onError: () => {
      toast.error('Failed to cancel invitation');
    },
  });

  // Remove team member mutation
  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => removeClientTeamMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-company-members'] });
      toast.success('Team member removed successfully');
    },
    onError: (error: any) => {
      const errorMessage = error?.message || 'Failed to remove team member';
      toast.error(errorMessage);
    },
  });

  // Update signing permission mutation
  const updateSigningPermissionMutation = useMutation({
    mutationFn: ({ memberId, canSign }: { memberId: string; canSign: boolean }) => 
      updateClientMemberSigningPermission(memberId, canSign),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-company-members'] });
      toast.success('Signing permission updated');
    },
    onError: () => {
      toast.error('Failed to update signing permission');
    },
  });

  return {
    company,
    membershipData,
    members: membersData?.data || [],
    pendingApprovals: pendingData?.data || [],
    pendingInvitations: pendingInvitations?.data || [],
    isAccountAdmin: isAccountAdmin || false,
    isLoading: isLoadingCompany || isLoadingMembers,
    approveMember: approveMutation.mutate,
    declineMember: declineMutation.mutate,
    inviteByEmail: inviteByEmailMutation.mutate,
    cancelInvitation: cancelInvitationMutation.mutate,
    removeMember: removeMemberMutation.mutate,
    updateSigningPermission: updateSigningPermissionMutation.mutate,
    isApproving: approveMutation.isPending,
    isDeclining: declineMutation.isPending,
    isInviting: inviteByEmailMutation.isPending,
    isCancelling: cancelInvitationMutation.isPending,
    isRemoving: removeMemberMutation.isPending,
    isUpdatingPermission: updateSigningPermissionMutation.isPending,
  };
}
