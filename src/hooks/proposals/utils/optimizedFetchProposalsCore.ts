import { logger } from "@/lib/logger";
import { fetchProposalsOptimized, OptimizedProposalData } from "./optimizedQueryBuilders";
import { supabase } from "@/lib/supabase/client";
import { ProposalFilters } from "../types";
import { UserRole } from "@/contexts/auth/types";

/**
 * Phase 5 Optimization: Enhanced core proposal fetching with database-level optimizations
 */
export async function fetchProposalsCoreOptimized(
  userId: string,
  userRole: UserRole | null,
  filters: ProposalFilters,
  limit = 20,
  offset = 0
): Promise<OptimizedProposalData[]> {
  const fetchLogger = logger.withContext({ 
    component: 'OptimizedFetchProposalsCore', 
    feature: 'proposals-optimization' 
  });

  fetchLogger.info("Starting optimized proposal fetch", { 
    userId, 
    userRole, 
    filters,
    limit,
    offset
  });

  try {
    // Use the optimized database function instead of complex client-side queries
    const data = await fetchProposalsOptimized(
      supabase,
      userId,
      userRole,
      filters,
      limit,
      offset
    );

    fetchLogger.info("Optimized proposals fetched successfully", { 
      count: data.length,
      userId,
      filters
    });
    
    return data;
  } catch (error) {
    fetchLogger.error("Optimized proposal fetch failed", { error, userId, filters });
    throw error;
  }
}