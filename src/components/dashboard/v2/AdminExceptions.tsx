import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { useAgentWarmCards } from "@/hooks/dashboard/useAgentWarmCards";
import { usePendingAgentApprovals } from "@/hooks/dashboard/usePendingAgentApprovals";
import {
  useAdminAuditReviewBlocked,
  useProposalsMwp,
} from "@/hooks/dashboard/useAdminAuditReviewBlocked";
import { DetailDrawer, type DrawerRow } from "@/components/dashboard/DetailDrawer";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { NO_MOVEMENT_DAYS } from "@/config/dashboardRules";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const rand = (n: number) => `R ${Math.round(n).toLocaleString("en-ZA")}`;
const mwp = (n: number) => `${n.toFixed(2)} MWp`;

/**
 * The one admin exception layer, as a compact action strip rather than a large
 * card. Each row states what is affected, how much MWp it holds up, and the one
 * action admin can take. Every rule is defined against real records:
 *
 *  - No movement: sent NO_MOVEMENT_DAYS+ days ago, unsigned. Provisional
 *    operational threshold, configurable in src/config/dashboardRules.ts.
 *  - Audit review: submitted_for_review AND NOT admin_validated — the same rule
 *    as the dashboard metric.
 *  - Partner approvals: accounts awaiting an admin decision.
 */
export function AdminExceptions() {
  const reduced = useReducedMotion();
  const { data: warm, isLoading } = useAgentWarmCards(50);
  const { data: pendingPartners } = usePendingAgentApprovals(true);
  const { data: auditReview } = useAdminAuditReviewBlocked(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: duplicateReviewCount = 0 } = useQuery({
    queryKey: ["proposal-duplicate-review-count"],
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("proposal_duplicate_reviews")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const stalled = useMemo(
    () =>
      (warm ?? [])
        .filter(
          (c) =>
            (c.days_since_sent ?? 0) >= NO_MOVEMENT_DAYS &&
            (c.bucket === "cold" || c.bucket === "dead" || c.bucket === "warm")
        )
        .sort(
          (a, b) =>
            (b.estimated_client_revenue ?? 0) - (a.estimated_client_revenue ?? 0)
        ),
    [warm]
  );

  const stalledIds = useMemo(() => stalled.map((c) => c.proposal_id), [stalled]);
  const { data: stalledMwp } = useProposalsMwp(stalledIds, stalled.length > 0);

  const stalledValue = stalled.reduce(
    (s, c) => s + (c.estimated_client_revenue ?? 0),
    0
  );

  const rows: DrawerRow[] = stalled.map((c) => ({
    id: c.proposal_id,
    title: c.client_name ?? "Unknown client",
    subtitle: c.title,
    meta: [
      c.estimated_client_revenue > 0 ? rand(c.estimated_client_revenue) : "Value —",
      `${c.days_since_sent}d since sent`,
      c.agent_company_name ?? "Partner unknown",
    ],
    recommendation:
      "No client movement for three weeks or more. Check whether the partner is still engaged or reassign the follow-up.",
    actionLabel: "Open",
    to: `/proposals/${c.proposal_id}`,
  }));

  const items: {
    id: string;
    what: string;
    impact: string;
    why: string;
    action: JSX.Element;
  }[] = [];

  if (duplicateReviewCount > 0) {
    items.push({
      id: "duplicate-reviews",
      what: `${duplicateReviewCount} duplicate project${duplicateReviewCount === 1 ? "" : "s"} awaiting review`,
      impact: "Ownership and commission held",
      why: "A second submission matched an existing installation.",
      action: (
        <Button asChild size="sm" variant="outline">
          <Link to="/admin/duplicate-reviews">Review duplicates<ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
        </Button>
      ),
    });
  }

  if ((auditReview?.count ?? 0) > 0) {
    items.push({
      id: "audit-review",
      what: `${auditReview!.count} project${auditReview!.count === 1 ? "" : "s"} awaiting audit review`,
      impact: `${mwp(auditReview!.mwp)} blocked from Audit Ready`,
      why: "Crunch Carbon review required before these can progress.",
      action: (
        <Button asChild size="sm" variant="outline">
          <Link to="/onboarding">
            Review onboarding
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      ),
    });
  }

  if (stalled.length > 0) {
    items.push({
      id: "stalled",
      what: `${stalled.length} proposal${stalled.length === 1 ? "" : "s"} with no movement`,
      impact:
        stalledMwp != null
          ? `${mwp(stalledMwp)} · ${rand(stalledValue)} est. client value`
          : `${rand(stalledValue)} est. client value`,
      why: `Unsigned for ${NO_MOVEMENT_DAYS}+ days since being sent.`,
      action: (
        <Button size="sm" variant="outline" onClick={() => setDrawerOpen(true)}>
          Review
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
    });
  }

  if ((pendingPartners ?? 0) > 0) {
    items.push({
      id: "partner-approvals",
      what: `${pendingPartners} partner account${pendingPartners === 1 ? "" : "s"} awaiting approval`,
      impact: "Distribution held up",
      why: "Unapproved partners cannot create proposals.",
      action: (
        <Button asChild size="sm" variant="outline">
          <Link to="/admin/agents">
            Approve partners
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      ),
    });
  }

  if (isLoading) {
    return <Skeleton className="mb-6 h-24 w-full" />;
  }

  return (
    <>
      <motion.section
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: reduced ? 0 : 0.08, ease: "easeOut" }}
        className="mb-6 rounded-lg border border-crunch-yellow/50 bg-card px-4 py-3"
      >
        <div className="flex items-center gap-2">
          {items.length === 0 ? (
            <CheckCircle2 className="h-4 w-4 text-[#8ED973]" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-crunch-yellow" />
          )}
          <p className="text-sm font-semibold">
            {items.length === 0 ? "Nothing requires intervention" : "Attention required"}
          </p>
        </div>

        {items.length === 0 ? (
          <p className="mt-1 pl-6 text-xs text-muted-foreground">
            No duplicate checks, audit reviews, stalled proposals or partner approvals outstanding.
          </p>
        ) : (
          <ul className="mt-1 divide-y">
            {items.map((item, i) => (
              <motion.li
                key={item.id}
                initial={reduced ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: reduced ? 0 : 0.12 + i * 0.04 }}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{item.what}</span>
                    <span className="text-muted-foreground"> · {item.impact}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{item.why}</p>
                </div>
                {item.action}
              </motion.li>
            ))}
          </ul>
        )}
      </motion.section>

      <DetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Proposals with no movement"
        description={`Unsigned for ${NO_MOVEMENT_DAYS}+ days since being sent, highest estimated client value first.`}
        rows={rows}
      />
    </>
  );
}
