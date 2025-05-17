
import { useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/auth";
import { useProposals } from "@/hooks/useProposals";
import { clearProposalsCache } from "./proposals/utils/proposalCache";

export function useDashboardData() {
  const { profile, userRole } = useAuth();
  const { proposals, fetchProposals, loading } = useProposals();
  
  // Calculate dashboard metrics - memoized to prevent unnecessary recalculations
  const metrics = useMemo(() => {
    // For demo/initial values if no data is available yet
    const defaultValues = {
      portfolioSize: 12.5, // MWp
      totalProposals: proposals.length || 8,
      potentialRevenue: 284350, // in Rands
      co2Offset: 1245 // in tCO2
    };
    
    // If we have real data, calculate actual values
    if (proposals.length > 0) {
      // Sum up the size of all proposals
      const calculatedSize = proposals.reduce((total, p) => total + p.size, 0);
      
      // Sum up the revenue of all proposals
      const calculatedRevenue = proposals.reduce((total, p) => total + p.revenue, 0);
      
      // Calculate CO2 offset based on portfolio size (simple formula for example)
      const calculatedCO2 = calculatedSize * 100; // 100 tCO2 per MWp is a placeholder
      
      return {
        portfolioSize: calculatedSize,
        totalProposals: proposals.length,
        potentialRevenue: calculatedRevenue,
        co2Offset: calculatedCO2
      };
    }
    
    return defaultValues;
  }, [proposals]);
  
  // User display functions - memoized to prevent unnecessary recalculations
  const userDisplayFunctions = useMemo(() => {
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
    
    return { getWelcomeMessage, getUserDisplayName, formatUserRole };
  }, [profile]);
  
  const handleRefreshProposals = useCallback(() => {
    console.log(`Manually refreshing proposals from dashboard`);
    clearProposalsCache(); // Clear cache to force refresh
    fetchProposals();
  }, [fetchProposals]);

  return {
    userRole,
    proposals,
    loading,
    ...metrics,
    ...userDisplayFunctions,
    handleRefreshProposals
  };
}
