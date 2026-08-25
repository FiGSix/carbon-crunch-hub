import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, CheckCircle2, Target } from "lucide-react";
import { useAgentWarmCards, type WarmCard } from "@/hooks/dashboard/useAgentWarmCards";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { DetailDrawer, type DrawerRow } from "@/components/dashboard/DetailDrawer";

/** Rank = value weighted by how long it has been waiting, hot before warm. */
function score(card: WarmCard): number {
  const bucketWeight = card.bucket === "hot" ? 1.6 : 1;
  const waiting = Math.max(card.days_since_sent ?? 0, 1);
  const value = Math.max(card.estimated_client_revenue ?? 0, 1);
  return value * Math.log10(waiting + 1) * bucketWeight;
}

const rand = (n: number) => `R ${Math.round(n).toLocaleString("en-ZA")}`;

/**
 * One ranked action — not a wall of tasks. Carries the only strong CTA on the
 * dashboard; everything below it stays visually quieter. When there is nothing
 * to do, it says so plainly rather than inventing work.
 */
export function NextBestAction() {
  const { data, isLoading } = useAgentWarmCards(20);
  const reduced = useReducedMotion();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const ranked = useMemo(
    () => [...(data ?? [])].sort((a, b) => score(b) - score(a)),
    [data]
  );
  const top = ranked[0];
  const others = ranked.slice(1);

  const rows: DrawerRow[] = ranked.map((c) => ({
    id: c.proposal_id,
    title: c.client_name ?? "Unknown client",
    subtitle: c.title,
    meta: [
      c.estimated_client_revenue > 0 ? rand(c.estimated_client_revenue) : "Value —",
      c.days_since_sent != null ? `${c.days_since_sent}d outstanding` : "Not yet sent",
      c.bucket.toUpperCase(),
    ],
    recommendation:
      c.bucket === "hot"
        ? "Strong engagement — a short call now is what closes this."
        : "Opened but unsigned. Ask if anything's unclear.",
    actionLabel: "Open",
    to: `/proposals/${c.proposal_id}`,
  }));

  if (isLoading) {
    return <Skeleton className="mb-6 h-32 w-full" />;
  }

  if (!top) {
    return (
      <Card className="mb-6">
        <CardContent className="flex items-start gap-3 py-6">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#8ED973]" />
          <div>
            <p className="font-semibold">You're all caught up</p>
            <p className="text-sm text-muted-foreground">
              There are currently no proposals or onboarding actions requiring your attention.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mb-6"
      >
        <Card className="border-crunch-yellow/50 shadow-sm">
          <CardContent className="py-5">
            <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Target className="h-3.5 w-3.5 text-crunch-yellow" />
              Highest-value opportunity
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">
                  {top.client_name ?? "Unknown client"}
                </p>
                <p className="truncate text-sm text-muted-foreground">{top.title}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {top.estimated_client_revenue > 0 && (
                    <span className="tabular-nums">{rand(top.estimated_client_revenue)}</span>
                  )}
                  {top.days_since_sent != null && (
                    <span className="tabular-nums">
                      Waiting {top.days_since_sent} day{top.days_since_sent === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {others.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setDrawerOpen(true)}>
                    {others.length} more waiting
                  </Button>
                )}
                <Button asChild>
                  <Link to={`/proposals/${top.proposal_id}`}>
                    Follow up
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <DetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Proposals awaiting acceptance"
        description="Ranked by value and how long each has been outstanding."
        rows={rows}
        emptyTitle="You're all caught up"
        emptyBody="No proposals are waiting on a client right now."
        footer={{ label: "View all proposals", to: "/proposals" }}
      />
    </>
  );
}
