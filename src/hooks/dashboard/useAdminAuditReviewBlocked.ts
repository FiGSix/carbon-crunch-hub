import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

export interface AuditReviewBlocked {
  count: number;
  mwp: number;
}

/**
 * Projects submitted for audit review that Crunch Carbon has not validated yet.
 *
 * Rule mirrors get_dashboard_metrics_by_stage exactly:
 *   submitted_for_review = true AND admin_validated = false
 * so the exception row can never disagree with the dashboard metric.
 *
 * MWp comes from proposals.system_size_kwp on the same records, so the figure
 * is derived, never estimated.
 */
export function useAdminAuditReviewBlocked(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "audit-review-blocked"],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<AuditReviewBlocked> => {
      const { data: onboarding, error } = await supabase
        .from("project_onboarding")
        .select("proposal_id")
        .eq("submitted_for_review", true)
        .eq("admin_validated", false);

      if (error) throw error;

      const ids = (onboarding ?? [])
        .map((r: { proposal_id: string | null }) => r.proposal_id)
        .filter((id): id is string => !!id);

      if (ids.length === 0) return { count: 0, mwp: 0 };

      const { data: proposals, error: pErr } = await supabase
        .from("proposals")
        .select("id, system_size_kwp")
        .in("id", ids)
        .is("archived_at", null)
        .is("deleted_at", null);

      if (pErr) throw pErr;

      const kwp = (proposals ?? []).reduce(
        (sum, p: { system_size_kwp: number | null }) =>
          sum + Number(p.system_size_kwp ?? 0),
        0
      );

      return { count: proposals?.length ?? 0, mwp: kwp / 1000 };
    },
  });
}

/**
 * MWp for a specific set of proposals. Used to state the MWp affected by an
 * exception rather than only a record count.
 */
export function useProposalsMwp(proposalIds: string[], enabled: boolean) {
  const key = [...proposalIds].sort().join(",");

  return useQuery({
    queryKey: ["admin", "proposals-mwp", key],
    enabled: enabled && proposalIds.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from("proposals")
        .select("system_size_kwp")
        .in("id", proposalIds);

      if (error) throw error;

      const kwp = (data ?? []).reduce(
        (sum, p: { system_size_kwp: number | null }) =>
          sum + Number(p.system_size_kwp ?? 0),
        0
      );
      return kwp / 1000;
    },
  });
}
