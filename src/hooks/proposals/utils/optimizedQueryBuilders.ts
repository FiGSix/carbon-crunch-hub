import { SupabaseClient } from '@supabase/supabase-js';
import { ProposalFilters } from '../types';
import { UserRole } from '@/contexts/auth/types';

/**
 * Phase 5 Optimization: Replace complex client-side queries with optimized database functions
 */

export interface OptimizedProposalData {
  id: string;
  title: string;
  status: string;
  created_at: string;
  agent_id: string;
  client_id?: string;
  client_reference_id?: string;
  carbon_credits?: number;
  system_size_kwp?: number;
  invitation_sent_at?: string;
  invitation_viewed_at?: string;
}

/**
 * Optimized proposal fetching using database function for better performance
 */
export async function fetchProposalsOptimized(
  supabase: SupabaseClient,
  userId: string,
  userRole: UserRole | null,
  filters: ProposalFilters,
  limit = 20,
  offset = 0
): Promise<OptimizedProposalData[]> {
  const { data, error } = await supabase.rpc('search_proposals_optimized', {
    user_id_param: userId,
    user_role_param: userRole || 'client',
    search_term: filters.search || null,
    status_filter: filters.status || 'all',
    limit_param: limit,
    offset_param: offset
  });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Optimized dashboard stats fetching using database function
 */
export async function fetchDashboardStatsOptimized(
  supabase: SupabaseClient,
  userId: string,
  userRole: UserRole | null
) {
  const { data, error } = await supabase.rpc('get_dashboard_stats_optimized', {
    user_id_param: userId,
    user_role_param: userRole || 'client'
  });

  if (error) {
    throw error;
  }

  return data?.[0] || {
    total_proposals: 0,
    active_proposals: 0,
    signed_proposals: 0,
    total_carbon_credits: 0,
    total_revenue: 0,
    portfolio_size_kwp: 0
  };
}

/**
 * Optimized profile queries - replace select('*') with specific fields
 */
export function buildOptimizedProfileQuery(supabase: SupabaseClient, userId: string) {
  return supabase
    .from('profiles')
    .select(`
      id,
      email,
      first_name,
      last_name,
      role,
      company_name,
      phone,
      avatar_url,
      company_logo_url,
      terms_accepted_at,
      created_at,
      intro_video_viewed,
      intro_video_viewed_at
    `)
    .eq('id', userId)
    .single();
}

/**
 * Optimized notification queries with proper indexing
 */
export function buildOptimizedNotificationQuery(
  supabase: SupabaseClient, 
  userId: string, 
  limit = 10,
  unreadOnly = false
) {
  let query = supabase
    .from('notifications')
    .select(`
      id,
      title,
      message,
      type,
      read,
      created_at,
      related_type,
      related_id
    `)
    .eq('user_id', userId);

  if (unreadOnly) {
    query = query.eq('read', false);
  }

  return query
    .order('created_at', { ascending: false })
    .limit(limit);
}