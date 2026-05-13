import { links } from "./links.ts";
import type { ActionableBlocker, CategorisedBlockers } from "./blockers.ts";
import type { AgentDeltas } from "./snapshots.ts";
import type { FunnelRow } from "./funnel.ts";
import type { AgentRevenueLens } from "./revenue.ts";

type AgentSegment = "new" | "active" | "top_performer";

export interface VintageProjectAtRisk {
  project_name: string;
  mwp: number;
  resolve_url: string;
  missing_items: string[];
}

export interface AgentEmailInput {
  agent: {
    first_name: string | null;
    is_team_lead: boolean;
  };
  segment: AgentSegment;
  metrics: {
    audit_ready_mwp: number;
    onboarding_mwp: number;
    pending_mwp: number;
    revenue_2025_2030: number;
    signed_this_week_count: number;
    signed_this_week_mwp: number;
    new_proposals_this_week: number;
  };
  team: {
    name: string;
    audit_ready_mwp: number;
    revenue_2025_2030: number;
    member_count: number;
    contribution_percent: number;
  };
  blockers: CategorisedBlockers;
  vintage: {
    days: number;
    hours: number;
    minutes: number;
    year: number;
  } | null;
  weekEndingLabel: string;
  // Phase 2 additions (all optional — email gracefully degrades if absent)
  deltas?: AgentDeltas;
  funnel?: FunnelRow[];
  revenue?: AgentRevenueLens;
  vintageAtRisk?: VintageProjectAtRisk[];
  vintageDeadlineLabel?: string;
}

const BRAND_YELLOW = "#FFCD03";
const BRAND_DARK = "#1a1a1a";

// ----------------------------------------------------------------------------
// SUBJECT
// ----------------------------------------------------------------------------

export function buildAgentSubject(input: AgentEmailInput): string {
  const totalBlockers =
    input.blockers.client.length +
    input.blockers.agent.length +
    input.blockers.crunch.length;
  const blockedMwp = input.blockers.total_blocked_mwp;
  const auditMwp = input.metrics.audit_ready_mwp;

  // Most urgent: client-action blockers with material MWp
  if (input.blockers.client.length > 0 && blockedMwp >= 0.1) {
    return `${formatMwp(blockedMwp)} MWp waiting on client action`;
  }
  if (input.blockers.agent.length > 0 && blockedMwp >= 0.1) {
    return `Your highest-value action this week — unlock ${formatMwp(blockedMwp)} MWp`;
  }
  if (input.segment === "new") {
    return "Your Crunch Carbon momentum starts here";
  }
  if (input.segment === "top_performer") {
    return `Leading the way: ${formatMwp(auditMwp)} MWp audit-ready`;
  }
  if (totalBlockers === 0 && auditMwp > 0) {
    return `Your weekly momentum report — ${formatMwp(auditMwp)} MWp audit-ready`;
  }
  return `Your weekly momentum report`;
}

// ----------------------------------------------------------------------------
// HTML
// ----------------------------------------------------------------------------

export function buildAgentHtml(input: AgentEmailInput): string {
  const firstName = input.agent.first_name || "there";
  const focus = pickThisWeeksFocus(input);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:640px;margin:0 auto;padding:20px;background:#f5f5f5;">
  <div style="background:#fff;padding:36px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.06);">

    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="color:${BRAND_DARK};font-size:22px;margin:0;">Your Weekly Momentum Report</h1>
      <p style="color:#888;margin:6px 0 0;font-size:13px;">Week ending ${escapeHtml(input.weekEndingLabel)}</p>
    </div>

    <p style="color:#333;font-size:16px;margin:0 0 12px;">Hi ${escapeHtml(firstName)},</p>
    <p style="color:#555;line-height:1.55;margin:0 0 24px;">${openingLine(input)}</p>

    ${headerCtaRow()}

    ${thisWeeksFocusSection(focus)}

    ${revenueSnapshot(input)}

    ${revenueLensSection(input)}

    ${funnelSection(input)}

    ${pipelineActionsSection(input)}

    ${blockersSection(input.blockers)}

    ${personalVintageSection(input)}

    ${teamSection(input)}

    ${finalCtaSection()}

    <hr style="border:none;border-top:1px solid #eee;margin:30px 0;">
    <p style="color:#555;line-height:1.55;margin:0 0 8px;">Every project moves your portfolio — and your commission — forward.</p>
    <p style="color:${BRAND_DARK};margin:18px 0 0;">— Crunch Carbon</p>
  </div>
</body></html>`;
}

// ----------------------------------------------------------------------------
// SECTIONS
// ----------------------------------------------------------------------------

function openingLine(input: AgentEmailInput): string {
  const m = input.metrics;
  if (m.signed_this_week_count > 0) {
    return `You signed <strong>${m.signed_this_week_count}</strong> proposal${m.signed_this_week_count === 1 ? "" : "s"} this week — ${formatMwp(m.signed_this_week_mwp)} MWp added to your portfolio.`;
  }
  if (input.blockers.total_blocked_mwp >= 0.1) {
    return `<strong>${formatMwp(input.blockers.total_blocked_mwp)} MWp</strong> of your portfolio is stuck behind specific blockers — see what's missing and where to act below.`;
  }
  if (input.segment === "new") {
    return `Welcome. Your first proposal unlocks compounding revenue — let's get one in motion this week.`;
  }
  return `Here's exactly what changed, what's stuck, and what to do next.`;
}

function headerCtaRow(): string {
  return `
  <table role="presentation" style="width:100%;margin:0 0 28px;border-collapse:separate;border-spacing:6px 0;">
    <tr>
      <td style="width:50%;">${ctaButton(links.dashboard(), "Open Dashboard", true)}</td>
      <td style="width:50%;">${ctaButton(links.createProposal(), "Add a New Proposal", false)}</td>
    </tr>
  </table>`;
}

function thisWeeksFocusSection(focus: { headline: string; detail: string; cta?: { label: string; url: string } } | null): string {
  if (!focus) return "";
  return `
  <div style="background:${BRAND_DARK};color:#fff;padding:22px;border-radius:8px;margin:0 0 28px;">
    <p style="margin:0 0 6px;color:${BRAND_YELLOW};font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">This Week's Focus</p>
    <h2 style="margin:0 0 10px;color:#fff;font-size:18px;">${escapeHtml(focus.headline)}</h2>
    <p style="margin:0 0 ${focus.cta ? "16px" : "0"};color:#ddd;line-height:1.55;font-size:14px;">${focus.detail}</p>
    ${focus.cta ? ctaButton(focus.cta.url, focus.cta.label, true) : ""}
  </div>`;
}

function revenueSnapshot(input: AgentEmailInput): string {
  const m = input.metrics;
  return `
  <h2 style="color:${BRAND_DARK};font-size:16px;margin:28px 0 12px;">Portfolio Snapshot</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#555;">Audit-ready</td><td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;color:${BRAND_DARK};font-weight:600;">${formatMwp(m.audit_ready_mwp)} MWp</td></tr>
    <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#555;">In onboarding</td><td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;color:#333;">${formatMwp(m.onboarding_mwp)} MWp</td></tr>
    <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#555;">Pending signature</td><td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;color:#333;">${formatMwp(m.pending_mwp)} MWp</td></tr>
    <tr><td style="padding:10px 0;color:#555;">Est. commission (2025–2030)</td><td style="padding:10px 0;text-align:right;color:${BRAND_YELLOW};font-weight:700;">${formatCurrency(m.revenue_2025_2030)}</td></tr>
  </table>`;
}

function pipelineActionsSection(input: AgentEmailInput): string {
  const m = input.metrics;
  if (m.pending_mwp <= 0 && m.new_proposals_this_week === 0) return "";
  const pendingLine = m.pending_mwp > 0
    ? `<li style="margin-bottom:6px;"><strong>${formatMwp(m.pending_mwp)} MWp</strong> in proposals awaiting client signature — <a href="${links.proposalsList()}" style="color:${BRAND_DARK};font-weight:600;">follow up &rarr;</a></li>`
    : "";
  const createdLine = m.new_proposals_this_week > 0
    ? `<li style="margin-bottom:6px;">${m.new_proposals_this_week} new proposal${m.new_proposals_this_week === 1 ? "" : "s"} created this week.</li>`
    : "";
  return `
  <h2 style="color:${BRAND_DARK};font-size:16px;margin:28px 0 12px;">Pipeline Actions</h2>
  <ul style="color:#555;line-height:1.6;font-size:14px;padding-left:20px;margin:0 0 14px;">${pendingLine}${createdLine}</ul>`;
}

function blockersSection(b: CategorisedBlockers): string {
  if (b.client.length === 0 && b.agent.length === 0 && b.crunch.length === 0) {
    return `
    <h2 style="color:${BRAND_DARK};font-size:16px;margin:28px 0 12px;">Blockers to Resolve</h2>
    <p style="color:#22c55e;font-size:14px;margin:0;">No active blockers — keep building.</p>`;
  }
  return `
  <h2 style="color:${BRAND_DARK};font-size:16px;margin:28px 0 12px;">Blockers to Resolve <span style="font-weight:400;color:#888;font-size:13px;">(${formatMwp(b.total_blocked_mwp)} MWp stuck)</span></h2>
  ${categoryBlock("Needs Client Action", b.client, "#dc2626")}
  ${categoryBlock("Needs Agent Action", b.agent, "#f59e0b")}
  ${categoryBlock("Needs Crunch Review", b.crunch, "#3b82f6")}
  `;
}

function categoryBlock(title: string, items: ActionableBlocker[], accent: string): string {
  if (items.length === 0) return "";
  const top = items.slice(0, 5);
  const more = items.length - top.length;
  const rows = top.map((b) => blockerCard(b, accent)).join("");
  const moreNote = more > 0
    ? `<p style="font-size:13px;color:#888;margin:6px 0 0;">…and ${more} more — <a href="${links.dashboard()}" style="color:${BRAND_DARK};">open dashboard</a>.</p>`
    : "";
  return `
  <div style="margin:0 0 18px;">
    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:${accent};text-transform:uppercase;letter-spacing:0.6px;">${escapeHtml(title)}</p>
    ${rows}
    ${moreNote}
  </div>`;
}

function blockerCard(b: ActionableBlocker, accent: string): string {
  const missing = b.missing_items.map((m) => `<li style="margin-bottom:2px;">${escapeHtml(m)}</li>`).join("");
  return `
  <div style="border:1px solid #eee;border-left:3px solid ${accent};border-radius:6px;padding:14px;margin:0 0 10px;background:#fafafa;">
    <p style="margin:0 0 4px;font-size:14px;color:${BRAND_DARK};font-weight:600;">${escapeHtml(b.project_name)} <span style="color:#888;font-weight:400;">— ${formatMwp(b.mwp)} MWp</span></p>
    <p style="margin:0 0 8px;font-size:13px;color:#666;">${escapeHtml(b.status)}</p>
    <p style="margin:0 0 4px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.4px;">Missing</p>
    <ul style="margin:0 0 12px;padding-left:18px;font-size:13px;color:#555;line-height:1.5;">${missing}</ul>
    ${ctaButton(b.resolve_url, b.primary_action_label, false, true)}
  </div>`;
}

function personalVintageSection(input: AgentEmailInput): string {
  if (!input.vintage) return "";
  const v = input.vintage;
  // Only show personal stake when there is onboarding MWp at risk
  const personalLine = input.metrics.onboarding_mwp > 0.001
    ? `<p style="color:#555;line-height:1.55;margin:10px 0 0;font-size:14px;">You have <strong>${formatMwp(input.metrics.onboarding_mwp)} MWp</strong> in onboarding that could still make Vintage ${v.year} if completed before the deadline.</p>`
    : `<p style="color:#888;font-size:13px;font-style:italic;margin:10px 0 0;">Projects added later roll into the next vintage — momentum carries forward.</p>`;
  return `
  <h2 style="color:${BRAND_DARK};font-size:16px;margin:28px 0 12px;">Vintage ${v.year} Countdown</h2>
  <div style="background:${BRAND_DARK};color:${BRAND_YELLOW};padding:18px;border-radius:8px;text-align:center;">
    <span style="font-size:26px;font-weight:700;">${v.days}</span><span style="font-size:13px;margin-right:14px;"> days</span>
    <span style="font-size:26px;font-weight:700;">${v.hours}</span><span style="font-size:13px;margin-right:14px;"> hours</span>
    <span style="font-size:26px;font-weight:700;">${v.minutes}</span><span style="font-size:13px;"> minutes</span>
  </div>
  ${personalLine}`;
}

function teamSection(input: AgentEmailInput): string {
  if (input.team.member_count <= 1) return "";
  return `
  <h2 style="color:${BRAND_DARK};font-size:16px;margin:28px 0 12px;">Team Momentum — ${escapeHtml(input.team.name)}</h2>
  <p style="color:#555;font-size:14px;line-height:1.55;margin:0;">
    Combined audit-ready: <strong>${formatMwp(input.team.audit_ready_mwp)} MWp</strong>.
    Your contribution: <strong>${input.team.contribution_percent.toFixed(0)}%</strong> of team signed portfolio.
  </p>`;
}

function finalCtaSection(): string {
  return `
  <div style="text-align:center;margin:32px 0 0;">
    ${ctaButton(links.dashboard(), "Open My Dashboard", true)}
  </div>`;
}

// ----------------------------------------------------------------------------
// FOCUS PICKER — single highest-value action this week
// ----------------------------------------------------------------------------

function pickThisWeeksFocus(
  input: AgentEmailInput
): { headline: string; detail: string; cta?: { label: string; url: string } } | null {
  // Score: prefer largest MWp unlock among blockers
  const all = [...input.blockers.client, ...input.blockers.agent, ...input.blockers.crunch];
  if (all.length > 0) {
    const top = all.slice().sort((a, b) => b.mwp - a.mwp)[0];
    return {
      headline: `Resolve ${top.project_name}`,
      detail: `This is your highest-value action this week — moving <strong>${formatMwp(top.mwp)} MWp</strong> closer to audit-ready. Missing: ${top.missing_items.join(", ")}.`,
      cta: { label: top.primary_action_label, url: top.resolve_url },
    };
  }
  if (input.metrics.pending_mwp > 0) {
    return {
      headline: `Follow up your pending proposals`,
      detail: `<strong>${formatMwp(input.metrics.pending_mwp)} MWp</strong> is sitting in proposals awaiting client signature. A short follow-up note this week could move them.`,
      cta: { label: "Follow up proposals", url: links.proposalsList() },
    };
  }
  if (input.segment === "new" || input.metrics.audit_ready_mwp + input.metrics.onboarding_mwp + input.metrics.pending_mwp === 0) {
    return {
      headline: `Add your first proposal`,
      detail: `Your first proposal unlocks the journey — every addition from here builds compounding commission through 2030.`,
      cta: { label: "Add a proposal", url: links.createProposal() },
    };
  }
  return null;
}

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

function ctaButton(url: string, label: string, primary: boolean, compact = false): string {
  const bg = primary ? BRAND_YELLOW : "#fff";
  const color = primary ? BRAND_DARK : BRAND_DARK;
  const border = primary ? BRAND_YELLOW : "#d4d4d4";
  const padding = compact ? "8px 16px" : "12px 20px";
  const fontSize = compact ? "13px" : "14px";
  return `<a href="${url}" style="display:inline-block;background:${bg};color:${color};border:1px solid ${border};text-decoration:none;font-weight:600;padding:${padding};border-radius:6px;font-size:${fontSize};text-align:center;">${escapeHtml(label)}</a>`;
}

function formatCurrency(amount: number): string {
  return `R ${Math.round(amount).toLocaleString("en-ZA")}`;
}

function formatMwp(mwp: number): string {
  return mwp.toFixed(3);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
