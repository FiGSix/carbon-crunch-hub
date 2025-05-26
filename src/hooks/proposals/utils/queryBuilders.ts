
import { SupabaseClient } from "@supabase/supabase-js";
import { ProposalFilters } from "@/types/proposals";

/**
 * Builds a Supabase query for fetching proposals with proper filtering and access control
 */
export function buildProposalQuery(
  supabase: SupabaseClient,
  filters: ProposalFilters,
  userRole: string | null,
  userId: string | null
) {
  // Base query with all needed fields - completely removed client_contact_id
  let query = supabase
    .from('proposals')
    .select(`
      id,
      title,
      content,
      status,
      created_at,
      client_id,
      client_reference_id,
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

  // Apply role-based filtering - explicitly skip filtering for admin users
  if (userRole === 'admin') {
    // Admin users see all proposals (no additional filtering)
    console.log('Admin user detected - bypassing all role-based filtering');
  } else if (userRole === 'client' && userId) {
    // Clients can only see their own proposals - use client_reference_id or client_id
    query = query.or(`client_id.eq.${userId},client_reference_id.eq.${userId}`);
  } else if (userRole === 'agent' && userId) {
    // Agents can see proposals assigned to them
    query = query.eq('agent_id', userId);
  }

  // Apply search filter
  if (filters.search) {
    query = query.ilike('title', `%${filters.search}%`);
  }

  // Apply status filter
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  // Apply sorting - database-level sorting for better performance
  if (filters.sort === 'newest') {
    query = query.order('created_at', { ascending: false });
  } else if (filters.sort === 'oldest') {
    query = query.order('created_at', { ascending: true });
  } else if (filters.sort === 'title') {
    query = query.order('title', { ascending: true });
  } else if (filters.sort === 'size-high') {
    query = query.order('annual_energy', { ascending: false, nullsFirst: false });
  } else if (filters.sort === 'size-low') {
    query = query.order('annual_energy', { ascending: true, nullsFirst: true });
  } else if (filters.sort === 'revenue-high') {
    query = query.order('carbon_credits', { ascending: false, nullsFirst: false });
  } else if (filters.sort === 'revenue-low') {
    query = query.order('carbon_credits', { ascending: true, nullsFirst: true });
  } else {
    // Default sort by creation date, newest first
    query = query.order('created_at', { ascending: false });
  }

  return query;
}
