import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

export interface LearningMetrics {
  avg_days_to_sign: number | null;
  median_days_to_sign: number | null;
  signed_last_30d: number;
  signed_last_90d: number;
  viewed_unsigned_count: number;
  viewed_unsigned_avg_age_days: number | null;
  hot_count: number;
  warm_count: number;
  cold_count: number;
  dead_count: number;
  signed_count: number;
  archived_count: number;
  inactive_count: number;
  hot_revenue: number;
  warm_revenue: number;
  cold_revenue: number;
  dead_revenue: number;
  signed_revenue: number;
  stale_rate_pct: number;
  agent_touch_to_sign_pct: number;
  total_signed: number;
  total_active: number;
}

/**
 * v1 Learning Engine — single-row aggregate of pipeline KPIs.
 * RLS via underlying proposals: agents see their own, admins see all.
 */
export function useLearningMetrics() {
  const { user, userRole } = useAuth();
  const enabled = !!user?.id && (userRole === "agent" || userRole === "admin");

  return useQuery({
    queryKey: ["learning-metrics", user?.id, userRole],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<LearningMetrics | null> => {
      const { data, error } = await (supabase as any)
        .from("learning_metrics")
        .select("*")
        .maybeSingle();
      if (error) {
        logger.error("Failed to load learning metrics", error);
        throw error;
      }
      return (data ?? null) as LearningMetrics | null;
    },
  });
}
