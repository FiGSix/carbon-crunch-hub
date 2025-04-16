
import { useState, useCallback, useEffect } from "react";
import { Proposal } from "@/components/proposals/ProposalList";
import { ProfileData, ProposalFilters, RawProposalData } from "./proposals/types";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth";
import { useToast } from "@/hooks/use-toast";
import { transformProposalData } from "./proposals/proposalUtils";
import { fetchProfilesByIds } from "./proposals/api/fetchProfiles";

export interface UseProposalsResult {
  proposals: Proposal[];
  loading: boolean;
  error: string | null;
  filters: ProposalFilters;
  handleFilterChange: (filter: string, value: string) => void;
  fetchProposals: () => Promise<void>;
}

export const useProposals = (): UseProposalsResult => {
  const { toast } = useToast();
  const { userRole, user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [filters, setFilters] = useState<ProposalFilters>({
    search: '',
    status: 'all',
    sort: 'newest'
  });

  const handleFilterChange = useCallback((filter: string, value: string) => {
    setFilters(prev => ({ ...prev, [filter]: value }));
  }, []);

  const handleAuthError = useCallback(async () => {
    console.log("Authentication error detected, refreshing session");
    try {
      await refreshUser();
      return !!user?.id; // Return true if user is still authenticated after refresh
    } catch (refreshError) {
      console.error("Failed to refresh user:", refreshError);
      return false; // Authentication refresh failed
    }
  }, [refreshUser, user]);

  const fetchProposals = useCallback(async () => {
    if (!user?.id) {
      console.log("No user ID found, attempting to refresh user session");
      try {
        const isAuthenticated = await handleAuthError();
        if (!isAuthenticated) {
          setError("Authentication issue detected. Please try logging in again.");
          setLoading(false);
          return;
        }
      } catch (refreshError) {
        console.error("Failed to refresh user:", refreshError);
        setError("Authentication issue detected. Please try logging out and back in.");
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching proposals with filters:", filters);
      console.log("Current user role:", userRole, "User ID:", user?.id);
      
      let query = supabase
        .from('proposals')
        .select(`
          id, 
          title, 
          created_at, 
          status, 
          content, 
          client_id,
          agent_id,
          annual_energy,
          carbon_credits,
          client_share_percentage,
          invitation_sent_at,
          invitation_viewed_at,
          invitation_expires_at,
          review_later_until
        `);
      
      // Apply filters
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      
      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }
      
      // Apply sorting
      switch (filters.sort) {
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'size-high':
        case 'size-low':
          query = query.order('annual_energy', { 
            ascending: filters.sort === 'size-low', 
            nullsFirst: filters.sort === 'size-low'
          });
          break;
        case 'revenue-high':
        case 'revenue-low':
          query = query.order('carbon_credits', { 
            ascending: filters.sort === 'revenue-low', 
            nullsFirst: filters.sort === 'revenue-low'
          });
          break;
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }
      
      const { data: proposalsData, error: queryError } = await query;
      
      if (queryError) {
        console.error("Supabase query error:", queryError);
        
        // Handle permission errors by refreshing session
        if (queryError.code === 'PGRST116' || queryError.code === '42501') {
          console.log("Permission error detected, trying to refresh session");
          const isAuthenticated = await handleAuthError();
          if (!isAuthenticated) {
            throw new Error("Permission error. Please try logging in again.");
          } else {
            throw new Error("Permission error. Please try again after refreshing.");
          }
        } else {
          throw queryError;
        }
      }
      
      console.log("Supabase returned proposals count:", proposalsData?.length || 0);
      
      if (!proposalsData || proposalsData.length === 0) {
        console.log("No proposals found with the current filters");
        setProposals([]);
        setLoading(false);
        return;
      }
      
      // Extract IDs for related data
      const clientIds = proposalsData.map(p => p.client_id).filter(Boolean);
      const agentIds = proposalsData
        .map(p => p.agent_id)
        .filter((id): id is string => id !== null && id !== undefined);
      
      // Fetch related profiles
      const [clientProfiles, agentProfiles] = await Promise.all([
        fetchProfilesByIds(clientIds),
        fetchProfilesByIds(agentIds)
      ]);
      
      // Transform the data
      const transformedProposals = transformProposalData(
        proposalsData as RawProposalData[], 
        clientProfiles,
        agentProfiles
      );
      
      console.log("Formatted proposals count:", transformedProposals.length);
      setProposals(transformedProposals);
    } catch (error) {
      console.error("Error fetching proposals:", error);
      setError(error instanceof Error ? error.message : "Failed to load proposals");
      
      // Show auth-specific errors with recovery options
      if (error instanceof Error && 
          (error.message.includes("JWT") || 
           error.message.includes("token") || 
           error.message.includes("auth") || 
           error.message.includes("permission"))) {
        toast({
          title: "Authentication Error",
          description: "Your session may have expired. Try refreshing the page or logging out and back in.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to load proposals. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [filters, user, userRole, toast, refreshUser, handleAuthError]);

  useEffect(() => {
    console.log("Initial fetch triggered");
    fetchProposals();
  }, [fetchProposals]);

  return {
    proposals,
    loading,
    error,
    filters,
    handleFilterChange,
    fetchProposals
  };
};
