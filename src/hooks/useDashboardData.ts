
import { useAuth } from "@/contexts/auth";
import { useProposals } from "@/hooks/useProposals";
import { useEffect } from "react";

export function useDashboardData(isPreview: boolean) {
  const { profile, userRole } = useAuth();
  const { proposals, fetchProposals, loading } = useProposals();
  
  // Log when dashboard mounts or proposals update
  useEffect(() => {
    console.log(`${isPreview ? 'Preview' : ''} Dashboard rendered with proposals count:`, proposals.length);
  }, [proposals.length, isPreview]);
  
  // Dashboard metrics
  const portfolioSize = 12.5; // MWp
  const totalProposals = proposals.length || 8;
  const potentialRevenue = 284350; // in Rands
  const co2Offset = 1245; // in tCO2
  
  // User display functions
  const getWelcomeMessage = () => {
    if (profile?.first_name) {
      return `Welcome back, ${profile.first_name}!`;
    }
    return 'Welcome back!';
  };
  
  const getUserDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    } else if (profile?.first_name) {
      return profile.first_name;
    } else if (profile?.company_name) {
      return profile.company_name;
    }
    return 'User';
  };
  
  const formatUserRole = (role: string | null): string => {
    if (!role) return '';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };
  
  const handleRefreshProposals = () => {
    console.log(`Manually refreshing proposals from ${isPreview ? 'preview ' : ''}dashboard`);
    fetchProposals();
  };

  return {
    profile,
    userRole,
    proposals,
    loading,
    portfolioSize,
    totalProposals,
    potentialRevenue,
    co2Offset,
    getWelcomeMessage,
    getUserDisplayName,
    formatUserRole,
    handleRefreshProposals
  };
}
