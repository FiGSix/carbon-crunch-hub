import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

export interface FunnelStage {
  label: string;
  mwp: number;
  /** Estimated revenue 2025–2030, when the source provides it. */
  revenue?: number;
  /** Where the stage drills down to. */
  to?: string;
  tone?: "neutral" | "pending" | "signed" | "ready";
}

interface PipelineFunnelProps {
  title?: string;
  subtitle?: string;
  stages: FunnelStage[];
  className?: string;
}

const fmtMwp = (n: number) => `${n.toFixed(2)} MWp`;
const fmtRand = (n: number) => `R ${Math.round(n).toLocaleString("en-ZA")}`;

const BAR: Record<NonNullable<FunnelStage["tone"]>, string> = {
  neutral: "bg-muted-foreground/40",
  pending: "bg-destructive/60",
  signed: "bg-crunch-yellow",
  ready: "bg-[#8ED973]",
};

/**
 * One progression view: where the MWp sits, and how much of it carries through
 * to the next stage. Widths are proportional to the largest stage so the scale
 * relationship between stages is readable at a glance.
 *
 * Every figure comes from get_dashboard_metrics_by_stage. Nothing here is
 * derived, weighted or estimated beyond the revenue the source already provides.
 */
export function PipelineFunnel({
  title = "Your pipeline",
  subtitle,
  stages,
  className,
}: PipelineFunnelProps) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const total = stages.reduce((s, x) => s + x.mwp, 0);
  const max = stages.reduce((m, x) => Math.max(m, x.mwp), 0);

  // Bars grow into position on first paint and tween on genuine value change.
  const [grown, setGrown] = useState(reduced);
  useEffect(() => {
    if (reduced) {
      setGrown(true);
      return;
    }
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, [reduced]);

  return (
    <Card className={cn("mb-6", className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <CardTitle className="text-lg">{title}</CardTitle>
          <span className="text-sm text-muted-foreground">
            <AnimatedNumber value={total} format={fmtMwp} /> in total
          </span>
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {total <= 0 ? (
          <p className="text-sm text-muted-foreground">
            No MWp in the pipeline yet.
          </p>
        ) : (
          <ol className="space-y-1">
            {stages.map((stage, i) => {
              const width = max > 0 ? (stage.mwp / max) * 100 : 0;
              const share = total > 0 ? (stage.mwp / total) * 100 : 0;
              const prev = stages[i - 1];
              const carry =
                prev && prev.mwp > 0 ? (stage.mwp / prev.mwp) * 100 : null;
              const clickable = !!stage.to;

              return (
                <li key={stage.label}>
                  {i > 0 && (
                    <div className="flex items-center gap-1.5 pl-1 py-1 text-xs text-muted-foreground">
                      <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                      {carry != null && (
                        <span className="tabular-nums">
                          {carry.toFixed(0)}% of the previous stage carried
                          through
                        </span>
                      )}
                    </div>
                  )}
                  <motion.button
                    type="button"
                    disabled={!clickable}
                    onClick={() => stage.to && navigate(stage.to)}
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.3,
                      delay: reduced ? 0 : 0.05 + i * 0.05,
                      ease: "easeOut",
                    }}
                    className={cn(
                      "group relative w-full overflow-hidden rounded-lg border px-4 py-3 text-left transition-all duration-200",
                      clickable
                        ? "cursor-pointer hover:border-foreground/25 hover:shadow-sm"
                        : "cursor-default"
                    )}
                  >
                    {/* Proportional fill behind the label — the funnel itself. */}
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 opacity-[0.16] transition-[width] ease-out",
                        reduced ? "duration-0" : "duration-[900ms]",
                        BAR[stage.tone ?? "neutral"]
                      )}
                      style={{ width: `${grown ? width : 0}%` }}
                      aria-hidden
                    />
                    <div className="relative flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {stage.label}
                        </p>
                        <p className="mt-0.5 text-xl font-semibold">
                          <AnimatedNumber value={stage.mwp} format={fmtMwp} />
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {share.toFixed(0)}% of pipeline
                        </p>
                        <p className="mt-0.5 h-4 text-xs text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          {stage.revenue != null ? (
                            <>{fmtRand(stage.revenue)} est. 2025–2030</>
                          ) : clickable ? (
                            <span className="inline-flex items-center gap-1">
                              View records
                              <ArrowRight className="h-3 w-3" />
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
