import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ArrowRight, CheckCircle2, MessageCircle } from "lucide-react";
import { useAgentWarmCards, type WarmCard } from "@/hooks/dashboard/useAgentWarmCards";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { DetailDrawer, type DrawerRow } from "@/components/dashboard/DetailDrawer";
import { toWaMeDigits } from "@/utils/phone/toWaMeDigits";
import {
  ATTENTION_SORT_LABEL,
  DEFAULT_ATTENTION_SORT,
  type AttentionSort,
} from "@/config/dashboardRules";

const rand = (n: number) => `R ${Math.round(n).toLocaleString("en-ZA")}`;

/**
 * Plain factual ordering only — no weighted score. Crunch Carbon has not yet
 * defined a prioritisation rule, so the list must be explainable from the data
 * shown on each row. See src/config/dashboardRules.ts.
 */
function compare(sort: AttentionSort) {
  return (a: WarmCard, b: WarmCard) => {
    if (sort === "value") {
      return (b.estimated_client_revenue ?? 0) - (a.estimated_client_revenue ?? 0);
    }
    return (b.days_since_sent ?? -1) - (a.days_since_sent ?? -1);
  };
}

function why(card: WarmCard): string {
  if (card.days_since_sent == null) {
    return "Created but not yet sent to the client.";
  }
  return `Sent ${card.days_since_sent} day${card.days_since_sent === 1 ? "" : "s"} ago with no signature yet.`;
}

interface AttentionRequiredProps {
  /** Rows shown at rest; the rest sit behind the drawer. */
  limit?: number;
  title?: string;
  subtitle?: string;
  /** Provisional ordering; see src/config/dashboardRules.ts. */
  sort?: AttentionSort;
}

/**
 * The single attention layer. Replaces the previous four overlapping surfaces
 * (next best action, warm cards, portfolio review, close-out queue).
 *
 * Data: proposal_engagement_buckets — real engagement, value and age fields.
 * Order: factual only (longest waiting, or highest value), stated in the copy.
 */
export function AttentionRequired({
  limit = 3,
  title = "What needs your attention",
  subtitle,
  sort = DEFAULT_ATTENTION_SORT,
}: AttentionRequiredProps) {
  const { data, isLoading, isError } = useAgentWarmCards(25);
  const reduced = useReducedMotion();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const caption = subtitle ?? ATTENTION_SORT_LABEL[sort];

  const ranked = useMemo(
    () => [...(data ?? [])].sort(compare(sort)),
    [data, sort]
  );
  const visible = ranked.slice(0, limit);
  const hidden = ranked.length - visible.length;

  const rows: DrawerRow[] = ranked.map((c) => ({
    id: c.proposal_id,
    title: c.client_name ?? "Unknown client",
    subtitle: c.title,
    meta: [
      c.estimated_client_revenue > 0 ? rand(c.estimated_client_revenue) : "Value —",
      c.days_since_sent != null ? `${c.days_since_sent}d outstanding` : "Not yet sent",
      c.bucket.toUpperCase(),
    ],
    recommendation: why(c),
    actionLabel: "Open",
    to: `/proposals/${c.proposal_id}`,
  }));

  if (isLoading) {
    return <Skeleton className="mb-6 h-44 w-full" />;
  }

  return (
    <>
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: reduced ? 0 : 0.05, ease: "easeOut" }}
      >
        <Card className="mb-6 border-crunch-yellow/50">
          <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-crunch-yellow" />
                {title}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            </div>
            {hidden > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setDrawerOpen(true)}>
                {hidden} more
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {isError ? (
              <p className="text-sm text-muted-foreground">
                Couldn't load this right now.
              </p>
            ) : visible.length === 0 ? (
              <div className="flex items-start gap-3 py-2">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#8ED973]" />
                <div>
                  <p className="font-medium">You're all caught up</p>
                  <p className="text-sm text-muted-foreground">
                    Nothing is waiting on a client or on you right now.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="divide-y">
                {visible.map((card, i) => {
                  const wa = card.client_phone ? toWaMeDigits(card.client_phone) : null;
                  return (
                    <motion.li
                      key={card.proposal_id}
                      initial={reduced ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.25,
                        delay: reduced ? 0 : 0.08 + i * 0.04,
                      }}
                      className="group flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {i + 1}
                          </span>
                          <p className="font-medium truncate">
                            {card.client_name ?? "Unknown client"}
                          </p>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {why(card)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {card.estimated_client_revenue > 0 && (
                          <span className="text-sm tabular-nums text-muted-foreground">
                            {rand(card.estimated_client_revenue)}
                          </span>
                        )}
                        {wa && (
                          <Button
                            asChild
                            size="sm"
                            variant="ghost"
                            className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                          >
                            <a
                              href={`https://wa.me/${wa}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button asChild size="sm" variant={i === 0 ? "default" : "outline"}>
                          <Link to={`/proposals/${card.proposal_id}`}>
                            {i === 0 ? "Follow up" : "Open"}
                            <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <DetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Proposals awaiting client action"
        description="Ranked by value and how long each has been outstanding."
        rows={rows}
        emptyTitle="You're all caught up"
        emptyBody="No proposals are waiting on a client right now."
        footer={{ label: "View all proposals", to: "/proposals" }}
      />
    </>
  );
}
