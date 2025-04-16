
import { useState, useCallback, useEffect } from "react";
import { Proposal } from "@/components/proposals/ProposalList";
import { ProfileData, ProposalFilters, RawProposalData } from "./proposals/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  const { userRole, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [filters, setFilters] = useState<ProposalFilters>({
    search: '',
    status: 'all',
    sort: 'newest'
  });

  // Memoized handler to prevent unnecessary re-renders
  const handleFilterChange = useCallback((filter: string, value: string) => {
    setFilters(prev => ({ ...prev, [filter]: value }));
  }, []);

  const fetchProposals = useCallback(async () => {
    if (!user?.id) {
      setError("Authentication issue detected. Please try refreshing your session.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching proposals with filters:", filters);
      console.log("Current user role:", userRole, "User ID:", user.id);
      
      // Start building the query - RLS will handle access control
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
      
      console.log(`User role: ${userRole} - RLS policies will automatically filter accessible proposals`);
      
      // Apply status filter if not 'all'
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
        console.log("Applied status filter:", filters.status);
      }
      
      // Apply search filter if provided
      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
        console.log("Applied search filter:", filters.search);
      }
      
      // Apply sorting
      switch (filters.sort) {
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'size-high':
        case 'size-low':
        case 'revenue-high':
          query = query.order('carbon_credits', { ascending: false, nullsFirst: false });
          break;
        case 'revenue-low':
          query = query.order('carbon_credits', { ascending: true, nullsFirst: true });
          break;
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }
      
      console.log("Applied sorting:", filters.sort);
      
      // Execute the query - our RLS policies will handle access control
      const { data: proposalsData, error: queryError } = await query;
      
      if (queryError) {
        console.error("Supabase query error:", queryError);
        if (queryError.code === 'PGRST116') {
          throw new Error("Access denied: You don't have permission to view these proposals");
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
      
      // Extract unique client and agent IDs
      const clientIds = proposalsData.map(p => p.client_id).filter(Boolean);
      const agentIds = proposalsData
        .map(p => p.agent_id)
        .filter((id): id is string => id !== null && id !== undefined);
      
      // Fetch profiles in parallel
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
      toast({
        title: "Error",
        description: "Failed to load proposals. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, user, userRole, toast]);

  // Initial fetch on component mount
  useEffect(() => {
    console.log("Initial fetch triggered");
    fetchProposals();
    
    // No need to include fetchProposals in the dependency array as it would cause infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    proposals,
    loading,
    error,
    filters,
    handleFilterChange,
    fetchProposals
  };
};
