import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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

const TONE: Record<NonNullable<FunnelStage["tone"]>, string> = {
  neutral: "bg-muted",
  pending: "bg-destructive/60",
  signed: "bg-crunch-yellow",
  ready: "bg-[#8ED973]",
};

/**
 * One funnel replaces the previous six equally-weighted stage cards.
 * Every figure comes from get_dashboard_metrics_by_stage; revenue is shown as
 * supporting detail rather than as its own card.
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {stages.map((stage, i) => {
              const share = total > 0 ? (stage.mwp / total) * 100 : 0;
              const clickable = !!stage.to;
              return (
                <motion.button
                  key={stage.label}
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
                    "group text-left rounded-lg border p-4 transition-colors",
                    clickable
                      ? "hover:border-foreground/25 hover:bg-muted/40 cursor-pointer"
                      : "cursor-default"
                  )}
                >
                  <p className="text-xs text-muted-foreground">{stage.label}</p>
                  <p className="mt-1 text-xl font-semibold">
                    <AnimatedNumber value={stage.mwp} format={fmtMwp} />
                  </p>
                  <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-700 ease-out",
                        TONE[stage.tone ?? "neutral"]
                      )}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                  <p className="mt-2 h-4 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    {stage.revenue != null
                      ? `${fmtRand(stage.revenue)} est. 2025–2030`
                      : clickable
                        ? "View projects"
                        : ""}
                  </p>
                </motion.button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
