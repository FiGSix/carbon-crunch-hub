import type { CarbonPrices } from "../_shared/carbonPricing.ts";

interface ProposalForRevenue {
  id: string;
  carbon_credits: number | null;
  agent_commission_percentage: number | null;
  system_size_kwp: number | null;
  signed_at: string | null;
  audit_ready?: boolean;
}

export interface AgentRevenueLens {
  short_term_2026: number;       // audit-ready × 2026 price × commission %
  long_term_2025_2030: number;   // audit-ready × cumulative × commission %
  locked_behind_blockers: number; // signed-but-not-audit-ready, 2025–2030
  pending_signature: number;      // unsigned proposals, 2025–2030
}

/**
 * Sum carbon credits × price × commission % for a year range.
 */
function commissionForYearRange(
  credits: number,
  commissionPct: number,
  prices: CarbonPrices,
  fromYear: number,
  toYear: number
): number {
  let total = 0;
  for (let y = fromYear; y <= toYear; y++) {
    const price = prices[String(y)] ?? 0;
    total += credits * price * (commissionPct / 100);
  }
  return total;
}

export function calculateAgentRevenueLens(
  agentProposals: ProposalForRevenue[],
  prices: CarbonPrices
): AgentRevenueLens {
  let shortTerm = 0;
  let longTerm = 0;
  let locked = 0;
  let pending = 0;

  for (const p of agentProposals) {
    const credits = p.carbon_credits ?? 0;
    const commission = p.agent_commission_percentage ?? 0;
    if (credits <= 0 || commission <= 0) continue;

    if (!p.signed_at) {
      pending += commissionForYearRange(credits, commission, prices, 2025, 2030);
      continue;
    }

    if (p.audit_ready) {
      shortTerm += commissionForYearRange(credits, commission, prices, 2026, 2026);
      longTerm += commissionForYearRange(credits, commission, prices, 2025, 2030);
    } else {
      // Signed but not audit-ready — revenue locked behind blockers.
      locked += commissionForYearRange(credits, commission, prices, 2025, 2030);
    }
  }

  return {
    short_term_2026: shortTerm,
    long_term_2025_2030: longTerm,
    locked_behind_blockers: locked,
    pending_signature: pending,
  };
}
