import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { links } from "./links.ts";

export interface FunnelMetrics {
  created_this_week: number;
  viewed_count: number;        // proposals with at least one open
  multi_viewed: number;        // ≥3 opens, not signed (strong follow-up signal)
  viewed_not_signed_7d: number; // viewed >7d ago, never signed
  expiring_7d: number;          // sent, not signed, created >23 days ago (assume 30d expiry)
  signed_this_week: number;
}

export interface FunnelRow {
  label: string;
  count: number;
  cta_label?: string;
  cta_url?: string;
  emphasis?: boolean;
}

interface ProposalLite {
  id: string;
  agent_id: string;
  status: string;
  signed_at: string | null;
  created_at: string;
}

const PROPOSAL_EXPIRY_DAYS = 30;

/**
 * Build proposal funnel metrics for one agent.
 * Reads email_events × the agent's proposals.
 */
export async function buildAgentFunnel(
  supabase: ReturnType<typeof createClient>,
  agentId: string,
  proposals: ProposalLite[]
): Promise<FunnelMetrics> {
  const agentProposals = proposals.filter((p) => p.agent_id === agentId);
  const proposalIds = agentProposals.map((p) => p.id);

  const empty: FunnelMetrics = {
    created_this_week: 0,
    viewed_count: 0,
    multi_viewed: 0,
    viewed_not_signed_7d: 0,
    expiring_7d: 0,
    signed_this_week: 0,
  };
  if (proposalIds.length === 0) return empty;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const expiryThreshold = new Date(now.getTime() - (PROPOSAL_EXPIRY_DAYS - 7) * 24 * 60 * 60 * 1000);

  // Count opens per proposal (cap query — if you have >100k events, add a date filter)
  const { data: events, error } = await supabase
    .from("email_events")
    .select("proposal_id, event_type, occurred_at")
    .in("proposal_id", proposalIds)
    .in("event_type", ["opened", "delivered", "clicked"]);

  if (error) {
    console.error(`[funnel] failed for agent ${agentId}:`, error.message);
  }

  const opensByProposal = new Map<string, { count: number; first_open: Date | null }>();
  (events ?? []).forEach((e: any) => {
    if (e.event_type !== "opened") return;
    const cur = opensByProposal.get(e.proposal_id) ?? { count: 0, first_open: null };
    cur.count += 1;
    const t = new Date(e.occurred_at);
    if (!cur.first_open || t < cur.first_open) cur.first_open = t;
    opensByProposal.set(e.proposal_id, cur);
  });

  let createdThisWeek = 0;
  let signedThisWeek = 0;
  let viewedCount = 0;
  let multiViewed = 0;
  let viewedNotSigned7d = 0;
  let expiring7d = 0;

  for (const p of agentProposals) {
    const created = new Date(p.created_at);
    const opens = opensByProposal.get(p.id);
    const signed = p.signed_at ? new Date(p.signed_at) : null;

    if (created > sevenDaysAgo) createdThisWeek++;
    if (signed && signed > sevenDaysAgo) signedThisWeek++;

    if (opens && opens.count > 0) viewedCount++;
    if (opens && opens.count >= 3 && !signed) multiViewed++;
    if (opens?.first_open && opens.first_open < sevenDaysAgo && !signed) viewedNotSigned7d++;

    // Expiring within 7 days: sent (has at least one delivered/opened) + not signed + close to expiry
    if (!signed && opens && created < expiryThreshold) expiring7d++;
  }

  return {
    created_this_week: createdThisWeek,
    viewed_count: viewedCount,
    multi_viewed: multiViewed,
    viewed_not_signed_7d: viewedNotSigned7d,
    expiring_7d: expiring7d,
    signed_this_week: signedThisWeek,
  };
}

export function funnelToRows(f: FunnelMetrics): FunnelRow[] {
  const rows: FunnelRow[] = [
    { label: "Created this week", count: f.created_this_week },
    { label: "Viewed by client", count: f.viewed_count },
    {
      label: "Multi-viewed, not signed",
      count: f.multi_viewed,
      cta_label: f.multi_viewed > 0 ? "Follow up" : undefined,
      cta_url: f.multi_viewed > 0 ? links.proposalsList() : undefined,
      emphasis: f.multi_viewed > 0,
    },
    {
      label: "Viewed >7 days ago, no signature",
      count: f.viewed_not_signed_7d,
      cta_label: f.viewed_not_signed_7d > 0 ? "Follow up" : undefined,
      cta_url: f.viewed_not_signed_7d > 0 ? links.proposalsList() : undefined,
      emphasis: f.viewed_not_signed_7d > 0,
    },
    {
      label: "Expiring within 7 days",
      count: f.expiring_7d,
      cta_label: f.expiring_7d > 0 ? "Re-engage" : undefined,
      cta_url: f.expiring_7d > 0 ? links.proposalsList() : undefined,
      emphasis: f.expiring_7d > 0,
    },
    { label: "Signed this week", count: f.signed_this_week },
  ];
  return rows;
}
