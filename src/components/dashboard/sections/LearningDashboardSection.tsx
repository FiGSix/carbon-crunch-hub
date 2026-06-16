import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Clock,
  Eye,
  TrendingDown,
  HandshakeIcon,
  Flame,
  Sun,
  Snowflake,
  Skull,
} from "lucide-react";
import { useLearningMetrics, type LearningMetrics } from "@/hooks/dashboard/useLearningMetrics";

/**
 * Step 7 — Learning dashboard.
 *
 * Surfaces the v1 KPIs the team needs to make decisions:
 *   - Time to sign (avg / median, last 30d / 90d)
 *   - Viewed but unsigned (count + age)
 *   - Pipeline by bucket
 *   - Stale rate
 *   - Agent-touch-to-sign conversion
 *   - Value by engagement
 *
 * No A/B tests, no weighted score — those are earned complexity (phase 2).
 */
export function LearningDashboardSection() {
  const { data, isLoading, isError } = useLearningMetrics();

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Learning dashboard
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          What the pipeline is telling us. Decisions, not vanity.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : isError || !data ? (
          <p className="text-sm text-muted-foreground">
            Couldn't load learning metrics.
          </p>
        ) : (
          <LearningGrid m={data} />
        )}
      </CardContent>
    </Card>
  );
}

function LearningGrid({ m }: { m: LearningMetrics }) {
  return (
    <div className="space-y-4">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          icon={<Clock className="h-4 w-4" />}
          label="Median time to sign"
          value={m.median_days_to_sign != null ? `${m.median_days_to_sign}d` : "—"}
          sub={m.avg_days_to_sign != null ? `avg ${m.avg_days_to_sign}d` : ""}
        />
        <Kpi
          icon={<HandshakeIcon className="h-4 w-4" />}
          label="Signed (30d / 90d)"
          value={`${m.signed_last_30d} / ${m.signed_last_90d}`}
          sub={`${m.total_signed} all-time`}
        />
        <Kpi
          icon={<Eye className="h-4 w-4" />}
          label="Viewed, unsigned"
          value={String(m.viewed_unsigned_count)}
          sub={
            m.viewed_unsigned_avg_age_days != null
              ? `avg ${m.viewed_unsigned_avg_age_days}d old`
              : ""
          }
          tone={m.viewed_unsigned_count > 0 ? "warn" : "default"}
        />
        <Kpi
          icon={<TrendingDown className="h-4 w-4" />}
          label="Stale rate"
          value={`${m.stale_rate_pct}%`}
          sub={`${m.total_active} active`}
          tone={m.stale_rate_pct >= 50 ? "warn" : "default"}
        />
      </div>

      {/* Pipeline by bucket */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Pipeline by engagement
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <BucketTile
            icon={<Flame className="h-3.5 w-3.5" />}
            label="Hot"
            count={m.hot_count}
            revenue={m.hot_revenue}
            className="bg-orange-50 text-orange-900 dark:bg-orange-950/40 dark:text-orange-100"
          />
          <BucketTile
            icon={<Sun className="h-3.5 w-3.5" />}
            label="Warm"
            count={m.warm_count}
            revenue={m.warm_revenue}
            className="bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
          />
          <BucketTile
            icon={<Snowflake className="h-3.5 w-3.5" />}
            label="Cold"
            count={m.cold_count}
            revenue={m.cold_revenue}
            className="bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100"
          />
          <BucketTile
            icon={<Skull className="h-3.5 w-3.5" />}
            label="Dead"
            count={m.dead_count}
            revenue={m.dead_revenue}
            className="bg-muted text-muted-foreground"
          />
        </div>
      </div>

      {/* Agent touch */}
      <div className="rounded-lg border bg-card p-3 flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-semibold">Agent-touch-to-sign</p>
          <p className="text-xs text-muted-foreground">
            % of signed proposals that had a logged agent contact first.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold tabular-nums">
            {m.agent_touch_to_sign_pct}%
          </span>
          {m.agent_touch_to_sign_pct === 0 && (
            <Badge variant="outline" className="text-[10px]">
              Awaiting agent contact logs
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "warn";
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        tone === "warn" ? "bg-amber-50/50 dark:bg-amber-950/20" : "bg-card"
      }`}
    >
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function BucketTile({
  icon,
  label,
  count,
  revenue,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  revenue: number;
  className: string;
}) {
  const rev =
    revenue > 0 ? `R ${formatCompact(revenue)}` : "—";
  return (
    <div className={`rounded-md p-2.5 ${className}`}>
      <div className="flex items-center gap-1.5 text-xs font-medium mb-0.5">
        {icon}
        {label}
      </div>
      <p className="text-lg font-bold tabular-nums leading-tight">{count}</p>
      <p className="text-[11px] opacity-80">{rev}</p>
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString();
}
