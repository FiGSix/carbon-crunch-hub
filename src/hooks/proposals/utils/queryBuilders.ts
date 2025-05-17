
import { SupabaseClient } from "@supabase/supabase-js";
import { ProposalFilters } from "@/types/proposals";
import { logger } from "@/lib/logger";

/**
 * Builds a query for fetching proposals with applied filters
 */
export function buildProposalQuery(
  supabase: SupabaseClient,
  filters: ProposalFilters,
  userRole: string | null = null,
  userId: string | null = null
) {
  const queryLogger = logger.withContext({ 
    component: 'QueryBuilder', 
    feature: 'proposals' 
  });
  
  queryLogger.debug("Building proposal query with filters", { 
    filters,
    userRole,
    userId
  });
  
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
  
  // Apply role-based filtering
  if (userRole && userId && userRole !== 'admin') {
    // If not admin, filter by the appropriate role column
    if (userRole === 'agent') {
      queryLogger.debug("Applying agent filter", { agent_id: userId });
      query = query.eq('agent_id', userId);
    } else if (userRole === 'client') {
      queryLogger.debug("Applying client filter", { client_id: userId });
      query = query.eq('client_id', userId);
    }
  } else if (userRole === 'admin') {
    queryLogger.debug("Admin user - no role filtering applied");
    // For admin users, we don't apply user-specific filters
    // They can see all proposals
  } else {
    queryLogger.warn("No user role or ID provided for filtering", { userRole, userId });
    // If no role is provided, default to a safe filter that returns nothing
    // This prevents data leakage in case of auth errors
    query = query.eq('id', '00000000-0000-0000-0000-000000000000');
  }
  
  // Apply status filter
  if (filters.status !== 'all') {
    queryLogger.debug("Applying status filter", { status: filters.status });
    query = query.eq('status', filters.status);
  }
  
  // Apply search filter
  if (filters.search) {
    queryLogger.debug("Applying search filter", { search: filters.search });
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
  
  queryLogger.debug("Query built successfully");
  return query;
}
