import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

export interface PortfolioReviewCluster {
  client_email: string;
  client_name: string | null;
  client_id: string | null;
  agent_id: string | null;
  unsigned_count: number;
  combined_revenue: number;
  warm_count: number;
  hot_count: number;
  proposal_ids: string[];
  last_engagement_at: string | null;
  last_portfolio_reminder_at: string | null;
  eligible_for_email: boolean;
  route_to_agent: boolean;
}

/**
 * Layer B route-to-agent clusters — clients who qualify for a portfolio
 * reminder on shape (≥2 unsigned OR ≥R500k) but are blocked by a gate
 * (cooldown, suppression, no warm, recent reminder). Surfaced as agent
 * review tasks — no client touch.
 */
export function usePortfolioReviewClusters(limit = 6) {
  const { user, userRole } = useAuth();
  const enabled = !!user?.id && (userRole === "agent" || userRole === "admin");

  return useQuery({
    queryKey: ["portfolio-review-clusters", user?.id, userRole, limit],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<PortfolioReviewCluster[]> => {
      const { data, error } = await (supabase as any)
        .from("portfolio_reminder_candidates")
        .select("*")
        .eq("route_to_agent", true)
        .order("combined_revenue", { ascending: false })
        .limit(limit);

      if (error) {
        logger.error("Failed to load portfolio review clusters", error);
        throw error;
      }
      return (data ?? []) as PortfolioReviewCluster[];
    },
  });
}
