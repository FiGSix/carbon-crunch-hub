
import { supabase } from "@/integrations/supabase/client";
import { ProposalFilters, RawProposalData } from "../types";

/**
 * Fetches proposal data from Supabase based on the provided filters
 */
export async function fetchProposalsData(
  filters: ProposalFilters,
  userId?: string,
  userRole?: string
): Promise<RawProposalData[]> {
  console.log("fetchProposalsData called with userRole:", userRole, "userId:", userId);
  
  if (!userId) {
    console.error("fetchProposalsData: Missing userId");
    throw new Error("User ID is required to fetch proposals");
  }
  
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
  
  // Add role-based filtering - only needed for clients
  // Agents will automatically be restricted by RLS
  if (userRole === 'client' && userId) {
    console.log("Filtering proposals for client:", userId);
    query = query.eq('client_id', userId);
  } else if (userRole === 'admin') {
    console.log("Admin user - no user-specific filtering applied");
    // Admins can see all proposals, no filter needed
  } else if (userRole === 'agent') {
    // For agents, the RLS policy handles the filtering automatically
    console.log("Agent user - RLS will handle filtering");
  } else {
    console.warn("Unknown or missing user role:", userRole);
  }
  
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
  let orderingApplied = false;
  switch (filters.sort) {
    case 'oldest':
      query = query.order('created_at', { ascending: true });
      orderingApplied = true;
      break;
    case 'size-high':
      // Will handle specialized sorting client-side
      query = query.order('created_at', { ascending: false });
      orderingApplied = true;
      break;
    case 'size-low':
      query = query.order('created_at', { ascending: false });
      orderingApplied = true;
      break;
    case 'revenue-high':
      query = query.order('carbon_credits', { ascending: false, nullsFirst: false });
      orderingApplied = true;
      break;
    case 'revenue-low':
      query = query.order('carbon_credits', { ascending: true, nullsFirst: true });
      orderingApplied = true;
      break;
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false });
      orderingApplied = true;
      break;
  }
  
  if (orderingApplied) {
    console.log("Applied sorting:", filters.sort);
  }
  
  try {
    // Execute the query
    const { data: proposalsData, error } = await query;
    
    if (error) {
      console.error("Supabase query error:", error);
      if (error.code === 'PGRST116') {
        throw new Error("Access denied: You don't have permission to view these proposals");
      } else {
        throw error;
      }
    }
    
    console.log("Supabase returned proposals count:", proposalsData?.length || 0);
    
    return proposalsData as RawProposalData[] || [];
  } catch (error) {
    console.error("Error in fetchProposalsData:", error);
    throw new Error(`Failed to fetch proposals: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
