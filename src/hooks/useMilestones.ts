import { useEffect, useMemo, useState } from "react";
import { safeStorage } from "@/lib/storage/safeStorage";

export interface Milestone {
  id: string;
  eyebrow: string;
  headline: string;
  body: string;
}

const MWP_THRESHOLDS = [10, 25, 50, 100];

function storageKey(userId: string) {
  return `cc:milestones:${userId}`;
}

function readSeen(userId: string): string[] {
  try {
    const raw = safeStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeSeen(userId: string, ids: string[]) {
  try {
    safeStorage.setItem(storageKey(userId), JSON.stringify(ids));
  } catch {
    /* non-critical */
  }
}

interface MilestoneInput {
  userId?: string | null;
  /** Total portfolio MWp across all stages. */
  portfolioMwp: number;
  /** MWp that has reached Audit Ready. */
  auditReadyMwp: number;
  /** MWp signed and in onboarding. */
  signedMwp: number;
  /** Skip evaluation while data is loading. */
  ready?: boolean;
}

/**
 * Derives meaningful milestones from metrics already on screen — first signed
 * project, first Audit Ready project, and portfolio MWp thresholds.
 * Each milestone is shown once per user; "seen" lives in local storage.
 */
export function useMilestones({
  userId,
  portfolioMwp,
  auditReadyMwp,
  signedMwp,
  ready = true,
}: MilestoneInput) {
  const [seen, setSeen] = useState<string[]>([]);

  useEffect(() => {
    if (userId) setSeen(readSeen(userId));
  }, [userId]);

  const earned = useMemo<Milestone[]>(() => {
    if (!ready) return [];
    const list: Milestone[] = [];

    if (signedMwp > 0) {
      list.push({
        id: "first-signed",
        eyebrow: "First signed project",
        headline: "Your portfolio has started",
        body: "A client has signed. That capacity is now moving through onboarding.",
      });
    }

    if (auditReadyMwp > 0) {
      list.push({
        id: "first-audit-ready",
        eyebrow: "First Audit Ready project",
        headline: "Audit Ready",
        body: "Your first project has completed onboarding and is ready for audit.",
      });
    }

    for (const t of MWP_THRESHOLDS) {
      if (portfolioMwp >= t) {
        list.push({
          id: `mwp-${t}`,
          eyebrow: "Portfolio milestone",
          headline: `${t} MWp`,
          body: `Your Crunch Carbon portfolio has now passed ${t} MWp.`,
        });
      }
    }

    return list;
  }, [ready, portfolioMwp, auditReadyMwp, signedMwp]);

  // Show the most significant unseen milestone only — never a stack.
  const milestone = useMemo(
    () => [...earned].reverse().find((m) => !seen.includes(m.id)) ?? null,
    [earned, seen]
  );

  const dismiss = (id: string) => {
    if (!userId) return;
    const next = Array.from(new Set([...seen, id]));
    setSeen(next);
    writeSeen(userId, next);
  };

  return { milestone, dismiss };
}
