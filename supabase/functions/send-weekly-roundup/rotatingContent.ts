/**
 * Phase 3.4 — Rotating content block.
 * One slot at the bottom of the email rotating by ISO week number % 4.
 * Static registry, no CMS.
 */

export interface RotatingBlock {
  kind: "tip" | "story" | "feature" | "objection";
  title: string;
  bodyHtml: string;
}

const REGISTRY: RotatingBlock[] = [
  {
    kind: "tip",
    title: "💡 Tip of the Week",
    bodyHtml:
      "Send your client a one-line voice note when you submit a proposal. Voice notes are opened 4× more than email follow-ups and dramatically shorten signature time.",
  },
  {
    kind: "story",
    title: "📖 From the Field",
    bodyHtml:
      "An agent in Cape Town moved 1.4 MWp from <em>onboarding</em> to <em>audit-ready</em> in a single week by sending a single resolve link to each client's WhatsApp. Specific, frictionless asks beat long emails every time.",
  },
  {
    kind: "feature",
    title: "🆕 New on Crunch Carbon",
    bodyHtml:
      "Your dashboard now surfaces <strong>blocker categories</strong> — client-action, agent-action, Crunch-review — so you always know who owns the next step. Open the dashboard to see yours.",
  },
  {
    kind: "objection",
    title: "🛡️ Objection Handler",
    bodyHtml:
      "<em>“Why should my client sign now and not in six months?”</em><br/>Because every signed MWp earns commission across 2025–2030. Six months of delay is six months of compounding revenue forfeited. The earlier the signature, the longer the curve.",
  },
];

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function pickRotatingBlock(now = new Date()): RotatingBlock {
  const week = getISOWeek(now);
  return REGISTRY[week % REGISTRY.length];
}
