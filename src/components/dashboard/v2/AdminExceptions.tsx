import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { useAgentWarmCards } from "@/hooks/dashboard/useAgentWarmCards";
import { usePendingAgentApprovals } from "@/hooks/dashboard/usePendingAgentApprovals";
import { DetailDrawer, type DrawerRow } from "@/components/dashboard/DetailDrawer";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { DashboardMetricsByStage } from "@/hooks/dashboard/types";

const STALLED_DAYS = 21;
const rand = (n: number) => `R ${Math.round(n).toLocaleString("en-ZA")}`;

interface AdminExceptionsProps {
  metrics?: DashboardMetricsByStage;
}

/**
 * The one admin exception layer. Each row states what is wrong, why it matters
 * and what admin can do, and every rule is defined against real records:
 *
 *  - Stalled proposals: sent 21+ days ago, unsigned, no engagement since.
 *  - Audit review requests: projects submitted for audit review.
 *  - Partner approvals: accounts awaiting an admin decision.
 */
export function AdminExceptions({ metrics }: AdminExceptionsProps) {
  const reduced = useReducedMotion();
  const { data: warm, isLoading } = useAgentWarmCards(50);
  const { data: pendingPartners } = usePendingAgentApprovals(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const stalled = useMemo(
    () =>
      (warm ?? [])
        .filter(
          (c) =>
            (c.days_since_sent ?? 0) >= STALLED_DAYS &&
            (c.bucket === "cold" || c.bucket === "dead" || c.bucket === "warm")
        )
        .sort(
          (a, b) =>
            (b.estimated_client_revenue ?? 0) - (a.estimated_client_revenue ?? 0)
        ),
    [warm]
  );

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
    why: string;
    action: JSX.Element;
  }[] = [];

  if (stalled.length > 0) {
    items.push({
      id: "stalled",
      what: `${stalled.length} proposal${stalled.length === 1 ? "" : "s"} stalled at proposal stage`,
      why: `${rand(stalledValue)} of estimated client value with no movement for ${STALLED_DAYS}+ days.`,
      action: (
        <Button size="sm" variant="outline" onClick={() => setDrawerOpen(true)}>
          Review
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
    });
  }

  if ((metrics?.auditReviewRequests ?? 0) > 0) {
    items.push({
      id: "audit-review",
      what: `${metrics!.auditReviewRequests} project${metrics!.auditReviewRequests === 1 ? "" : "s"} awaiting audit review`,
      why: "These cannot reach Audit Ready until Crunch Carbon reviews them.",
      action: (
        <Button asChild size="sm" variant="outline">
          <Link to="/onboarding">
            Open onboarding
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      ),
    });
  }

  if ((pendingPartners ?? 0) > 0) {
    items.push({
      id: "partner-approvals",
      what: `${pendingPartners} partner account${pendingPartners === 1 ? "" : "s"} awaiting approval`,
      why: "Unapproved partners cannot create proposals, so distribution stalls.",
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
    return <Skeleton className="mb-6 h-40 w-full" />;
  }

  return (
    <>
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: reduced ? 0 : 0.05, ease: "easeOut" }}
      >
        <Card className="mb-6 border-crunch-yellow/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-crunch-yellow" />
              Attention required
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Only exceptions that need a Crunch Carbon decision.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            {items.length === 0 ? (
              <div className="flex items-start gap-3 py-2">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#8ED973]" />
                <div>
                  <p className="font-medium">Nothing requires intervention</p>
                  <p className="text-sm text-muted-foreground">
                    No stalled proposals, audit reviews or partner approvals outstanding.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="divide-y">
                {items.map((item, i) => (
                  <motion.li
                    key={item.id}
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: reduced ? 0 : 0.08 + i * 0.04 }}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{item.what}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.why}</p>
                    </div>
                    {item.action}
                  </motion.li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <DetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Stalled proposals"
        description={`Sent ${STALLED_DAYS}+ days ago, still unsigned, ordered by value.`}
        rows={rows}
        emptyTitle="Nothing stalled"
        emptyBody="Every active proposal has moved recently."
        footer={{ label: "View all proposals", to: "/proposals" }}
      />
    </>
  );
}
