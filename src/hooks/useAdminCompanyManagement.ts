import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  getAllCompaniesForAdmin,
  getCompanyDetailsForAdmin,
  promoteToTeamLead,
  demoteFromTeamLead,
  removeMemberFromCompany,
  updateCompanyDetails,
  updateClientCompanyDetails,
  promoteToAccountAdmin,
  demoteFromAccountAdmin,
  removeClientMemberFromCompany,
  updateClientSigningPermission,
  approveClientMemberAdmin,
  declineClientMemberAdmin,
} from '@/lib/supabase/company/adminCompanyOperations';
import { approveMember, declineMember } from '@/lib/supabase/company/companyOperations';

export function useAdminCompanyManagement(companyId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all companies with stats
  const { data: companies, isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: getAllCompaniesForAdmin,
  });

  // Fetch detailed company info (works for both agent AND client companies)
  const { data: companyDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['admin-company-details', companyId],
    queryFn: () => companyId ? getCompanyDetailsForAdmin(companyId) : null,
    enabled: !!companyId,
  });

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-company-details'] });
    queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  // Promote to team lead (agent) or account admin (client)
  const promoteMutation = useMutation({
    mutationFn: async ({ memberId, userId, companyType }: { memberId: string; userId: string; companyType: 'agent' | 'client' }) => {
      if (companyType === 'client') {
        return promoteToAccountAdmin(memberId);
      }
      return promoteToTeamLead(memberId, userId);
    },
    onSuccess: (_, { companyType }) => {
      invalidateQueries();
      toast({
        title: "Success",
        description: companyType === 'client' ? "Member promoted to Account Admin" : "Member promoted to Team Lead",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to promote member",
        variant: "destructive",
      });
      console.error('Promote error:', error);
    },
  });

  // Demote from team lead (agent) or account admin (client)
  const demoteMutation = useMutation({
    mutationFn: async ({ memberId, userId, companyType }: { memberId: string; userId: string; companyType: 'agent' | 'client' }) => {
      if (companyType === 'client') {
        return demoteFromAccountAdmin(memberId);
      }
      return demoteFromTeamLead(memberId, userId);
    },
    onSuccess: (_, { companyType }) => {
      invalidateQueries();
      toast({
        title: "Success",
        description: companyType === 'client' ? "Account Admin demoted to member" : "Team Lead demoted to member",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to demote member",
        variant: "destructive",
      });
      console.error('Demote error:', error);
    },
  });

  // Remove member
  const removeMutation = useMutation({
    mutationFn: async ({ memberId, companyType }: { memberId: string; companyType: 'agent' | 'client' }) => {
      if (companyType === 'client') {
        return removeClientMemberFromCompany(memberId);
      }
      return removeMemberFromCompany(memberId);
    },
    onSuccess: () => {
      invalidateQueries();
      toast({
        title: "Success",
        description: "Member removed from company",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      });
      console.error('Remove error:', error);
    },
  });

  // Approve member (works for both agent and client companies)
  const approveMutation = useMutation({
    mutationFn: async ({ memberId, userId, companyType }: { memberId: string; userId: string; companyType: 'agent' | 'client' }) => {
      if (companyType === 'client') {
        return approveClientMemberAdmin(memberId, userId);
      }
      return approveMember(memberId, userId);
    },
    onSuccess: () => {
      invalidateQueries();
      toast({
        title: "Success",
        description: "Member approved",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to approve member",
        variant: "destructive",
      });
      console.error('Approve error:', error);
    },
  });

  // Decline member (works for both agent and client companies)
  const declineMutation = useMutation({
    mutationFn: async ({ memberId, companyType }: { memberId: string; companyType: 'agent' | 'client' }) => {
      if (companyType === 'client') {
        return declineClientMemberAdmin(memberId);
      }
      return declineMember(memberId);
    },
    onSuccess: () => {
      invalidateQueries();
      toast({
        title: "Success",
        description: "Member request declined",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to decline member",
        variant: "destructive",
      });
      console.error('Decline error:', error);
    },
  });

  // Update company (supports both agent and client companies)
  const updateCompanyMutation = useMutation({
    mutationFn: ({ companyId, updates, companyType }: { companyId: string; updates: { company_name?: string; email_domain?: string | null }; companyType: 'agent' | 'client' }) => {
      if (companyType === 'client') {
        return updateClientCompanyDetails(companyId, updates);
      }
      return updateCompanyDetails(companyId, updates);
    },
    onSuccess: () => {
      invalidateQueries();
      toast({
        title: "Success",
        description: "Company details updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update company",
        variant: "destructive",
      });
      console.error('Update error:', error);
    },
  });

  // Toggle signing permission (client companies only)
  const toggleSigningMutation = useMutation({
    mutationFn: ({ memberId, canSign }: { memberId: string; canSign: boolean }) =>
      updateClientSigningPermission(memberId, canSign),
    onSuccess: () => {
      invalidateQueries();
      toast({
        title: "Success",
        description: "Signing permission updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update signing permission",
        variant: "destructive",
      });
      console.error('Toggle signing error:', error);
    },
  });

  return {
    companies,
    isLoadingCompanies,
    companyDetails,
    isLoadingDetails,
    promoteToTeamLead: promoteMutation.mutate,
    demoteFromTeamLead: demoteMutation.mutate,
    removeMember: removeMutation.mutate,
    approveMember: approveMutation.mutate,
    declineMember: declineMutation.mutate,
    updateCompany: updateCompanyMutation.mutate,
    toggleSigningPermission: toggleSigningMutation.mutate,
    isPromoting: promoteMutation.isPending,
    isDemoting: demoteMutation.isPending,
    isRemoving: removeMutation.isPending,
    isApproving: approveMutation.isPending,
    isDeclining: declineMutation.isPending,
    isTogglingSign: toggleSigningMutation.isPending,
  };
}
