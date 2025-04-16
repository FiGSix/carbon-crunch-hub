
import { useState, useCallback, useEffect } from "react";
import { Proposal } from "@/components/proposals/ProposalList";
import { ProfileData, ProposalFilters, RawProposalData } from "./proposals/types";
import { supabase } from "@/lib/supabase";
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
  const { userRole, user } = useAuth();
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
      
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
        console.log("Applied status filter:", filters.status);
      }
      
      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
        console.log("Applied search filter:", filters.search);
      }
      
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
      
      const clientIds = proposalsData.map(p => p.client_id).filter(Boolean);
      const agentIds = proposalsData
        .map(p => p.agent_id)
        .filter((id): id is string => id !== null && id !== undefined);
      
      const [clientProfiles, agentProfiles] = await Promise.all([
        fetchProfilesByIds(clientIds),
        fetchProfilesByIds(agentIds)
      ]);
      
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
