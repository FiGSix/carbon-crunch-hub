import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, CheckCircle2, FileSignature } from "lucide-react";
import { safeStorage } from "@/lib/storage/safeStorage";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { DashboardMetricsByStage } from "@/hooks/dashboard/types";

interface Snapshot {
  auditReadyMwp: number;
  onboardingMwp: number;
  pendingApprovalMwp: number;
  at: string;
}

interface SinceLastVisitProps {
  metrics?: DashboardMetricsByStage;
  userId?: string | null;
}

function key(userId: string) {
  return `cc:dash-snapshot:${userId}`;
}

const fmt = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)} MWp`;

/**
 * Compact re-entry strip: what changed since the user was last here.
 * Never a modal. Renders nothing when there is no delta to report.
 */
export function SinceLastVisit({ metrics, userId }: SinceLastVisitProps) {
  const reduced = useReducedMotion();
  const [previous, setPrevious] = useState<Snapshot | null>(null);

  useEffect(() => {
    if (!userId || !metrics) return;
    let prior: Snapshot | null = null;
    try {
      const raw = safeStorage.getItem(key(userId));
      prior = raw ? (JSON.parse(raw) as Snapshot) : null;
    } catch {
      prior = null;
    }
    setPrevious(prior);

    const next: Snapshot = {
      auditReadyMwp: metrics.auditReadyMwp,
      onboardingMwp: metrics.onboardingMwp,
      pendingApprovalMwp: metrics.pendingApprovalMwp,
      at: new Date().toISOString(),
    };
    try {
      safeStorage.setItem(key(userId), JSON.stringify(next));
    } catch {
      /* non-critical */
    }
    // Deliberately snapshot once per mount so the strip stays still while read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, !!metrics]);

  const items = useMemo(() => {
    if (!metrics || !previous) return [];
    const out: { icon: JSX.Element; text: string }[] = [];

    const auditDelta = metrics.auditReadyMwp - previous.auditReadyMwp;
    const signedDelta = metrics.onboardingMwp - previous.onboardingMwp;
    const pipelineDelta = metrics.pendingApprovalMwp - previous.pendingApprovalMwp;

    if (auditDelta > 0.001) {
      out.push({
        icon: <CheckCircle2 className="h-3.5 w-3.5 text-[#8ED973]" />,
        text: `${fmt(auditDelta)} reached Audit Ready`,
      });
    }
    if (signedDelta > 0.001) {
      out.push({
        icon: <FileSignature className="h-3.5 w-3.5 text-crunch-yellow" />,
        text: `${fmt(signedDelta)} signed and in onboarding`,
      });
    }
    if (pipelineDelta > 0.001) {
      out.push({
        icon: <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />,
        text: `${fmt(pipelineDelta)} added to your pipeline`,
      });
    }
    return out;
  }, [metrics, previous]);

  if (items.length === 0) return null;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="mb-6 rounded-lg border bg-card px-4 py-3"
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
        Since your last visit
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {items.map((item) => (
          <span key={item.text} className="inline-flex items-center gap-2 text-sm">
            {item.icon}
            <span>{item.text}</span>
          </span>
        ))}
      </div>
    </motion.div>
  );
}
