
import { supabase } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { buildBaseProposalsQuery } from "./queryBuilders";
import { RawProposalData, ProposalFilters } from "../types";
import { UserRole } from "@/contexts/auth/types";

/**
 * Core function to fetch proposals from Supabase
 * Returns the raw proposal data for further processing
 */
export async function fetchProposalsCore(
  userId: string,
  userRole: UserRole | null,
  filters: ProposalFilters
): Promise<RawProposalData[]> {
  // Create a contextualized logger
  const fetchLogger = logger.withContext({ 
    component: 'FetchProposalsCore', 
    feature: 'proposals' 
  });

  fetchLogger.info("Starting proposal fetch", { 
    userId, 
    userRole, 
    filters 
  });

  // Build and execute the query
  const query = buildBaseProposalsQuery(supabase, userRole, userId, filters);
  const { data: proposalsData, error } = await query;

  if (error) {
    fetchLogger.error("Supabase query error", { error });
    throw error;
  }

  if (!proposalsData) {
    fetchLogger.warn("No proposals data returned");
    return [];
  }

  fetchLogger.info("Raw proposals fetched", { count: proposalsData.length });
  return proposalsData as RawProposalData[];
}
