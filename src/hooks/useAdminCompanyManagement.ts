import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  getAllCompaniesForAdmin,
  getCompanyDetailsForAdmin,
  promoteToTeamLead,
  demoteFromTeamLead,
  removeMemberFromCompany,
  updateCompanyDetails,
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

  // Fetch detailed company info
  const { data: companyDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['admin-company-details', companyId],
    queryFn: () => companyId ? getCompanyDetailsForAdmin(companyId) : null,
    enabled: !!companyId,
  });

  // Promote to team lead
  const promoteMutation = useMutation({
    mutationFn: ({ memberId, userId }: { memberId: string; userId: string }) =>
      promoteToTeamLead(memberId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-company-details'] });
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: "Success",
        description: "Member promoted to team lead",
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

  // Demote from team lead
  const demoteMutation = useMutation({
    mutationFn: ({ memberId, userId }: { memberId: string; userId: string }) =>
      demoteFromTeamLead(memberId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-company-details'] });
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: "Success",
        description: "Team lead demoted to member",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to demote team lead",
        variant: "destructive",
      });
      console.error('Demote error:', error);
    },
  });

  // Remove member
  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeMemberFromCompany(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-company-details'] });
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
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

  // Approve member (reusing from regular operations)
  const approveMutation = useMutation({
    mutationFn: ({ memberId, userId }: { memberId: string; userId: string }) =>
      approveMember(memberId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-company-details'] });
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
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

  // Decline member
  const declineMutation = useMutation({
    mutationFn: (memberId: string) => declineMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-company-details'] });
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
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

  // Update company
  const updateCompanyMutation = useMutation({
    mutationFn: ({ companyId, updates }: { companyId: string; updates: any }) =>
      updateCompanyDetails(companyId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-company-details'] });
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
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
    isPromoting: promoteMutation.isPending,
    isDemoting: demoteMutation.isPending,
    isRemoving: removeMutation.isPending,
    isApproving: approveMutation.isPending,
    isDeclining: declineMutation.isPending,
  };
}
