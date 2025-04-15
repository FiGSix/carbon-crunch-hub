
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
  if (userRole === 'agent' && userId) {
    // Agents can only see their own proposals
    query = query.eq('agent_id', userId);
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
  
  return proposalsData as RawProposalData[] || [];
}
