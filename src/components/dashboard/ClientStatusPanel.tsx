import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Check, CheckCircle2, Loader2 } from "lucide-react";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { AnimatedProgress } from "@/components/motion/AnimatedProgress";
import { StageBadge } from "@/components/motion/StageBadge";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { DashboardMetricsByStage } from "@/hooks/dashboard/types";

interface ClientStatusPanelProps {
  metrics?: DashboardMetricsByStage;
  loading?: boolean;
}

const mwp = (n: number) => `${n.toFixed(2)} MWp`;

/**
 * The Client surface: clarity → confidence → completion.
 * States what Crunch Carbon is doing, what (if anything) is needed from the
 * client, and how close their capacity is to Audit Ready. When nothing is
 * required, it deliberately goes quiet rather than inventing tasks.
 */
export function ClientStatusPanel({ metrics, loading }: ClientStatusPanelProps) {
  const reduced = useReducedMotion();

  if (loading || !metrics) {
    return <Skeleton className="mb-6 h-48 w-full" />;
  }

  const awaiting = metrics.pendingApprovalMwp;
  const onboarding = metrics.onboardingMwp;
  const auditReady = metrics.auditReadyMwp;
  const total = awaiting + onboarding + auditReady;
  const progress = total > 0 ? (auditReady / total) * 100 : 0;

  const stage =
    awaiting > 0 ? "action-required" : onboarding > 0 ? "in-progress" : "complete";

  const stageLabel =
    stage === "action-required"
      ? "Action required"
      : stage === "in-progress"
        ? "In progress with Crunch Carbon"
        : "Up to date";

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mb-6"
    >
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-lg">Your carbon portfolio</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Where your projects stand on the way to Audit Ready.
            </p>
          </div>
          <StageBadge
            stage={stage}
            label={stageLabel}
            variant={stage === "action-required" ? "default" : "secondary"}
          />
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Metric label="Awaiting your signature" value={awaiting} />
            <Metric label="In onboarding" value={onboarding} />
            <Metric label="Audit Ready" value={auditReady} accent />
          </div>

          <AnimatedProgress
            value={progress}
            label="Progress to Audit Ready"
            showValue
          />

          {stage === "action-required" ? (
            <div className="flex flex-col gap-3 rounded-lg border border-crunch-yellow/50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Review and sign your agreement</p>
                <p className="text-sm text-muted-foreground">
                  {mwp(awaiting)} is waiting on your signature before onboarding can start.
                </p>
              </div>
              <Button asChild className="shrink-0">
                <Link to="/proposals">
                  Review now
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : stage === "in-progress" ? (
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <Loader2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Nothing needed from you right now</p>
                <p className="text-sm text-muted-foreground">
                  We're completing onboarding on {mwp(onboarding)}. We'll email you if
                  anything is required.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#8ED973]" />
              <div>
                <p className="text-sm font-semibold">You're up to date</p>
                <p className="text-sm text-muted-foreground">
                  {auditReady > 0
                    ? `${mwp(auditReady)} has completed onboarding and is ready for audit.`
                    : "There's nothing outstanding on your account."}
                </p>
              </div>
            </div>
          )}

          {auditReady > 0 && (
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-[#8ED973]" />
              Onboarding complete on {mwp(auditReady)}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ? "text-[#8ED973]" : ""}`}>
        <AnimatedNumber value={value} format={(n) => n.toFixed(2)} />
        <span className="ml-1 text-sm font-medium text-muted-foreground">MWp</span>
      </p>
    </div>
  );
}
