
import { SupabaseClient } from "@supabase/supabase-js";
import { ProposalFilters } from "@/types/proposals";
import { logger } from "@/lib/logger";

/**
 * Builds a query for fetching proposals with applied filters
 */
export function buildProposalQuery(
  supabase: SupabaseClient,
  filters: ProposalFilters
) {
  const queryLogger = logger.withContext({ 
    component: 'QueryBuilder', 
    feature: 'proposals' 
  });
  
  queryLogger.debug("Building proposal query with filters", { filters });
  
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
      review_later_until,
      is_preview,
      preview_of_id
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
  
  return query;
}
