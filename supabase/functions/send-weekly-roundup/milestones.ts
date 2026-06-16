/**
 * Phase 3.2 — Milestones engine.
 * Detects threshold proximity, signing streaks (vs prior snapshot), and rank changes.
 * Pure functions — no IO. Returns 0..N badges to render above the focus block.
 */

import type { AgentSnapshot } from "./snapshots.ts";

export interface Milestone {
  emoji: string;
  label: string;
}

export interface MilestoneInput {
  current: AgentSnapshot;
  previous: AgentSnapshot | null;
  /** 1-indexed rank by audit-ready MWp this week, null if not ranked */
  currentRank: number | null;
  /** Same ranking from previous snapshot, null if no baseline */
  previousRank: number | null;
  totalRanked: number;
}

const THRESHOLDS_MWP = [1, 2.5, 5, 10, 25, 50];

export function buildMilestones(input: MilestoneInput): Milestone[] {
  const out: Milestone[] = [];
  const { current, previous, currentRank, previousRank, totalRanked } = input;

  // Threshold proximity (audit-ready)
  for (const t of THRESHOLDS_MWP) {
    const gap = t - current.audit_ready_mwp;
    if (gap > 0 && gap <= 0.5) {
      out.push({ emoji: "🎯", label: `${gap.toFixed(2)} MWp from ${t} MWp audit-ready` });
      break;
    }
    if (
      previous &&
      previous.audit_ready_mwp < t &&
      current.audit_ready_mwp >= t
    ) {
      out.push({ emoji: "🏆", label: `Crossed ${t} MWp audit-ready` });
      break;
    }
  }

  // Signing streak (week-over-week)
  if (previous && current.signed_this_week_mwp > 0 && previous.signed_this_week_mwp > 0) {
    out.push({ emoji: "🔥", label: "2+ week signing streak" });
  }

  // Rank change
  if (currentRank != null && previousRank != null && currentRank < previousRank) {
    const jumped = previousRank - currentRank;
    out.push({
      emoji: "📈",
      label: `Up ${jumped} place${jumped === 1 ? "" : "s"} → #${currentRank}${totalRanked ? ` of ${totalRanked}` : ""}`,
    });
  } else if (currentRank != null && currentRank <= 3) {
    out.push({ emoji: "🥇", label: `Top ${currentRank} agent this week` });
  }

  // New proposals badge
  if (current.new_proposals_count >= 3) {
    out.push({ emoji: "⚡", label: `${current.new_proposals_count} new proposals this week` });
  }

  return out.slice(0, 3);
}
