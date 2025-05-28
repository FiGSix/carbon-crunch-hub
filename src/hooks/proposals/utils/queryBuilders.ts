
import { SupabaseClient } from '@supabase/supabase-js';
import { ProposalFilters } from '../types';

/**
 * Build the base query for fetching proposals
 */
export function buildBaseProposalsQuery(
  supabase: SupabaseClient,
  userRole: string | null,
  userId: string | null,
  filters: ProposalFilters
) {
  let query = supabase
    .from('proposals')
    .select(`
      id,
      title,
      status,
      created_at,
      signed_at,
      archived_at,
      review_later_until,
      client_id,
      client_reference_id,
      agent_id,
      content,
      annual_energy,
      carbon_credits,
      client_share_percentage,
      agent_commission_percentage,
      system_size_kwp,
      unit_standard
    `)
    .is('deleted_at', null); // Exclude soft-deleted proposals

  // Apply role-based filtering
  if (userRole === 'client' && userId) {
    query = query.or(`client_id.eq.${userId},client_reference_id.eq.${userId}`);
  } else if (userRole === 'agent' && userId) {
    query = query.eq('agent_id', userId);
  }
  // Admin role gets all non-deleted proposals (no additional filter needed)

  // Apply status filter
  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'archived') {
      query = query.not('archived_at', 'is', null);
    } else if (filters.status === 'review-later') {
      query = query
        .not('review_later_until', 'is', null)
        .gte('review_later_until', new Date().toISOString());
    } else {
      query = query.eq('status', filters.status);
    }
  }

  // Apply search filter
  if (filters.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,content->clientInfo->>email.ilike.%${filters.search}%,content->clientInfo->>firstName.ilike.%${filters.search}%,content->clientInfo->>lastName.ilike.%${filters.search}%,content->clientInfo->>companyName.ilike.%${filters.search}%`
    );
  }

  // Apply sorting
  if (filters.sort === 'oldest') {
    query = query.order('created_at', { ascending: true });
  } else if (filters.sort === 'title') {
    query = query.order('title', { ascending: true });
  } else if (filters.sort === 'status') {
    query = query.order('status', { ascending: true });
  } else {
    // Default to newest first
    query = query.order('created_at', { ascending: false });
  }

  return query;
}
