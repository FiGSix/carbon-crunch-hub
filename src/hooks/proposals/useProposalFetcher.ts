
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Proposal } from "@/components/proposals/ProposalList";
import { ProfileData, ProposalFilters, RawProposalData } from "./types";
import { applyClientSideSorting, transformProposalData } from "./proposalUtils";
import { useToast } from "@/hooks/use-toast";

export function useProposalFetcher() {
  const { toast } = useToast();
  const { userRole, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<Proposal[]>([]);

  const fetchProposals = async (filters: ProposalFilters) => {
    try {
      setLoading(true);
      console.log("Fetching proposals with filters:", filters);
      
      // Start building the query
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
      
      // Filter by role
      if (userRole === 'agent' && user?.id) {
        // Agents can only see their own proposals
        query = query.eq('agent_id', user.id);
      }
      
      // Apply status filter if not 'all'
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      
      // Apply search filter if provided
      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }
      
      // Apply sorting
      switch (filters.sort) {
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'size-high':
          // Note: We can't directly sort by content->projectInfo->size as it's in JSON
          // We'll sort this after fetching
          query = query.order('created_at', { ascending: false });
          break;
        case 'size-low':
          query = query.order('created_at', { ascending: false });
          break;
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
      
      // Execute the query
      const { data: proposalsData, error } = await query;
      
      if (error) {
        console.error("Supabase query error:", error);
        throw error;
      }
      
      console.log("Raw proposals data:", proposalsData);
      
      if (!proposalsData || proposalsData.length === 0) {
        console.log("No proposals found with the current filters");
        setProposals([]);
        return [];
      }
      
      // Fetch profiles and transform proposal data
      const transformedProposals = await fetchProfilesAndTransformData(proposalsData as RawProposalData[]);
      
      // Apply client-side sorting if needed
      const sortedProposals = applyClientSideSorting(transformedProposals, filters.sort);
      
      console.log("Formatted proposals:", sortedProposals);
      setProposals(sortedProposals);
      return sortedProposals;
    } catch (error) {
      console.error("Error fetching proposals:", error);
      toast({
        title: "Error",
        description: "Failed to load proposals. Please try again.",
        variant: "destructive",
      });
      setProposals([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Helper function to fetch profiles and transform proposal data
  const fetchProfilesAndTransformData = async (proposalsData: RawProposalData[]): Promise<Proposal[]> => {
    // Fetch client profiles
    const clientIds = proposalsData.map(p => p.client_id).filter(Boolean);
    let clientProfiles: Record<string, ProfileData> = {};
    
    if (clientIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', clientIds);
        
      if (profilesError) {
        console.error("Error fetching client profiles:", profilesError);
      } else if (profilesData) {
        clientProfiles = profilesData.reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {} as Record<string, ProfileData>);
      }
    }
    
    // Fetch agent profiles
    const agentIds = proposalsData
      .map(p => p.agent_id)
      .filter((id): id is string => id !== null && id !== undefined);
    
    let agentProfiles: Record<string, ProfileData> = {};
    
    if (agentIds.length > 0) {
      const { data: agentsData, error: agentsError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', agentIds);
        
      if (agentsError) {
        console.error("Error fetching agent profiles:", agentsError);
      } else if (agentsData) {
        agentProfiles = agentsData.reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {} as Record<string, ProfileData>);
      }
    }
    
    console.log("Client profiles:", clientProfiles);
    console.log("Agent profiles:", agentProfiles);
    
    // Transform the data
    return transformProposalData(proposalsData, clientProfiles, agentProfiles);
  };

  return {
    loading,
    proposals,
    fetchProposals,
  };
}
