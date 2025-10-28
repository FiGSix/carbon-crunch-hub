import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import {
  getUserCompany,
  getCompanyMembers,
  getPendingApprovals,
  approveMember,
  declineMember,
  inviteMember,
  isUserTeamLead
} from '@/lib/supabase/company/companyOperations';
import { toast } from 'sonner';

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

  return {
    company,
    membershipData,
    members: membersData?.data || [],
    pendingApprovals: pendingData?.data || [],
    isTeamLead: isTeamLead || false,
    isLoading: isLoadingCompany || isLoadingMembers,
    approveMember: approveMutation.mutate,
    declineMember: declineMutation.mutate,
    inviteMember: inviteMutation.mutate,
    isApproving: approveMutation.isPending,
    isDeclining: declineMutation.isPending,
  };
}
