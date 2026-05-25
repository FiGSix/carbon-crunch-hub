import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth";
import { logManualAgentContact } from "@/services/proposals/agentContactLogger";
import { Briefcase, ArrowRight, Phone, Mail } from "lucide-react";
import {
  usePortfolioReviewClusters,
  type PortfolioReviewCluster,
} from "@/hooks/dashboard/usePortfolioReviewClusters";

/**
 * Layer B route-to-agent surface. Clients who qualify for a portfolio
 * reminder on shape but are blocked by a gate (cooldown, no warm, recent
 * reminder). Becomes an agent review task — no automated email is sent.
 */
export function PortfolioReviewSection() {
  const { data, isLoading, isError } = usePortfolioReviewClusters(6);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary" />
          Portfolio review
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Multiple unsigned proposals — automated reminders blocked. Worth a personal touch.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-muted-foreground">
            Couldn't load portfolio review clusters.
          </p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No portfolio clusters need agent review right now.
          </p>
        ) : (
          <div className="space-y-2">
            {data.map((c) => (
              <ClusterRow key={c.client_email} cluster={c} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ClusterRow({ cluster }: { cluster: PortfolioReviewCluster }) {
  const { user } = useAuth();
  const revenue =
    cluster.combined_revenue > 0
      ? `R ${Math.round(cluster.combined_revenue).toLocaleString()}`
      : "—";

  const reason = getBlockReason(cluster);
  const mailHref = cluster.client_email
    ? `mailto:${cluster.client_email}?subject=${encodeURIComponent(
        "Your Crunch Carbon proposals"
      )}`
    : null;

  const handleMailClick = async () => {
    if (!mailHref || !cluster.proposal_ids[0] || !user?.id) return;
    await logManualAgentContact({
      proposalId: cluster.proposal_ids[0],
      userId: user.id,
      triggerEvent: "portfolio_review_email",
      details: {
        method: "mailto",
        client_email: cluster.client_email,
        unsigned_count: cluster.unsigned_count,
      },
    });
    window.open(mailHref, "_blank");
  };

  return (
    <div className="rounded-lg border bg-card p-3 flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="text-sm font-semibold truncate">
            {cluster.client_name || cluster.client_email}
          </p>
          <Badge variant="secondary" className="text-[10px]">
            {cluster.unsigned_count} unsigned
          </Badge>
          <span className="text-xs text-muted-foreground">{revenue}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{reason}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {mailHref && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2"
            onClick={handleMailClick}
          >
            <Mail className="h-3.5 w-3.5" />
          </Button>
        )}
        {cluster.proposal_ids[0] && (
          <Button asChild size="sm" variant="ghost" className="h-8 px-2">
            <a href={`/proposals/${cluster.proposal_ids[0]}`}>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

function getBlockReason(c: PortfolioReviewCluster): string {
  if (c.warm_count === 0) {
    return `${c.unsigned_count} unsigned proposals but no recent warm engagement — a call beats another email.`;
  }
  if (c.last_portfolio_reminder_at) {
    const days = Math.round(
      (Date.now() - new Date(c.last_portfolio_reminder_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return `Portfolio reminder sent ${days}d ago — cooldown active. Personal touch recommended.`;
  }
  return `In 7-day platform cooldown or recent agent contact — reach out personally instead.`;
}
