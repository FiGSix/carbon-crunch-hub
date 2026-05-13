/**
 * Phase 3.1 — 7-segment classifier.
 * Single source of truth for: segment id, subject variants (A/B), opening line,
 * focus weighting tag, and CTA priority. All downstream copy reads from here.
 */

export type AgentSegmentV2 =
  | "new_agent"
  | "activated"
  | "stuck"
  | "growing"
  | "top_performer"
  | "at_risk_pipeline"
  | "audit_momentum";

export interface SegmentInput {
  joinDate: string | null;
  signedCount: number;
  auditReadyMwp: number;
  pendingMwp: number;
  signedThisWeekMwp: number;
  newProposalsThisWeek: number;
  blockedMwp: number;
  /** ms since last activity (proposal create OR sign), null if none */
  msSinceLastActivity: number | null;
}

export interface SegmentConfig {
  id: AgentSegmentV2;
  /** Two subject templates for A/B testing. {{n}} placeholders supported. */
  subjects: { A: (ctx: SegmentInput) => string; B: (ctx: SegmentInput) => string };
  opening: (ctx: SegmentInput, firstName: string) => string;
  /** Weighting tag for focus picker — informational only, picker still scores. */
  focusWeight: "blocker_first" | "follow_up_first" | "create_first" | "nurture";
  ctaPriority: Array<"resolve" | "follow_up" | "create" | "dashboard">;
}

const DAY = 1000 * 60 * 60 * 24;

function fmtMwp(n: number): string {
  return n.toFixed(3);
}

export function classifyAgent(ctx: SegmentInput): AgentSegmentV2 {
  const joinedAt = ctx.joinDate ? new Date(ctx.joinDate).getTime() : Date.now();
  const ageDays = (Date.now() - joinedAt) / DAY;

  if (ctx.signedCount === 0 || ageDays < 14) return "new_agent";

  if (ctx.msSinceLastActivity != null && ctx.msSinceLastActivity > 21 * DAY) {
    return "stuck";
  }

  if (ctx.auditReadyMwp >= 5) return "top_performer";

  // High pending vs converted = at_risk_pipeline
  if (ctx.pendingMwp > 0 && ctx.pendingMwp > ctx.auditReadyMwp * 1.5 && ctx.pendingMwp >= 0.5) {
    return "at_risk_pipeline";
  }

  if (ctx.signedThisWeekMwp > 0 || ctx.newProposalsThisWeek > 0) {
    if (ctx.auditReadyMwp >= 1) return "audit_momentum";
    return "growing";
  }

  return "activated";
}

export const SEGMENT_CONFIG: Record<AgentSegmentV2, SegmentConfig> = {
  new_agent: {
    id: "new_agent",
    subjects: {
      A: () => "Your Crunch Carbon momentum starts here",
      B: () => "First proposal = first commission. Let's go.",
    },
    opening: (_c, n) =>
      `Welcome ${n}. Your first proposal unlocks compounding revenue through 2030 — let's get one in motion this week.`,
    focusWeight: "create_first",
    ctaPriority: ["create", "dashboard"],
  },
  activated: {
    id: "activated",
    subjects: {
      A: () => "Your weekly momentum report",
      B: () => "What changed, what's stuck, what to do next",
    },
    opening: (_c, n) => `Hi ${n}, here's exactly what changed in your portfolio this week and where to act next.`,
    focusWeight: "create_first",
    ctaPriority: ["create", "follow_up", "dashboard"],
  },
  stuck: {
    id: "stuck",
    subjects: {
      A: () => "It's been a quiet 3 weeks — let's restart",
      B: () => "One proposal this week resets your momentum",
    },
    opening: (_c, n) =>
      `Hi ${n}, your portfolio has been quiet for 3+ weeks. The fastest restart is one new proposal — even a small system compounds revenue through 2030.`,
    focusWeight: "create_first",
    ctaPriority: ["create", "dashboard"],
  },
  growing: {
    id: "growing",
    subjects: {
      A: (c) => `+${fmtMwp(c.signedThisWeekMwp || c.auditReadyMwp)} MWp this week — keep going`,
      B: () => "Your portfolio is compounding — here's this week's lever",
    },
    opening: (_c, n) => `Hi ${n}, your portfolio is moving. Here's the highest-leverage action to keep the curve climbing.`,
    focusWeight: "blocker_first",
    ctaPriority: ["resolve", "create", "follow_up"],
  },
  top_performer: {
    id: "top_performer",
    subjects: {
      A: (c) => `Leading the way: ${fmtMwp(c.auditReadyMwp)} MWp audit-ready`,
      B: () => "You're setting the pace. Here's how to widen the lead.",
    },
    opening: (_c, n) =>
      `Hi ${n}, you're in the top tier of agents this week. Your next moves widen the gap and compound 2025–2030 commission.`,
    focusWeight: "blocker_first",
    ctaPriority: ["resolve", "follow_up", "create"],
  },
  at_risk_pipeline: {
    id: "at_risk_pipeline",
    subjects: {
      A: (c) => `${fmtMwp(c.pendingMwp)} MWp sitting unsigned — your move`,
      B: () => "Your pipeline is heavy on pending. Here's what to chase.",
    },
    opening: (_c, n) =>
      `Hi ${n}, you have meaningful MWp sitting in proposals waiting on client signature. Following up this week is your single highest-value move.`,
    focusWeight: "follow_up_first",
    ctaPriority: ["follow_up", "resolve", "create"],
  },
  audit_momentum: {
    id: "audit_momentum",
    subjects: {
      A: (c) => `${fmtMwp(c.auditReadyMwp)} MWp audit-ready and climbing`,
      B: () => "You're compounding fast — protect the momentum",
    },
    opening: (_c, n) =>
      `Hi ${n}, your audit-ready MWp keeps climbing. The actions below protect the curve and convert pipeline into long-term commission.`,
    focusWeight: "blocker_first",
    ctaPriority: ["resolve", "follow_up", "create"],
  },
};

export function pickVariant(): "A" | "B" {
  return Math.random() < 0.5 ? "A" : "B";
}

export function getSubject(seg: AgentSegmentV2, variant: "A" | "B", ctx: SegmentInput): string {
  return SEGMENT_CONFIG[seg].subjects[variant](ctx);
}

export function getOpening(seg: AgentSegmentV2, ctx: SegmentInput, firstName: string): string {
  return SEGMENT_CONFIG[seg].opening(ctx, firstName);
}
