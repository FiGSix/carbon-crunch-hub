import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AgentSnapshot {
  audit_ready_mwp: number;
  onboarding_mwp: number;
  pending_signature_mwp: number;
  signed_this_week_mwp: number;
  new_proposals_count: number;
  estimated_commission_2026: number;
  estimated_commission_2025_2030: number;
}

export interface SnapshotDelta {
  value: number;
  delta: number; // positive = up
  has_baseline: boolean;
}

export type AgentDeltas = Record<keyof AgentSnapshot, SnapshotDelta>;

/**
 * Read the most recent prior snapshot for an agent (any date strictly before today).
 */
export async function readPreviousSnapshot(
  supabase: ReturnType<typeof createClient>,
  agentId: string
): Promise<AgentSnapshot | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("agent_weekly_snapshots")
    .select("*")
    .eq("agent_id", agentId)
    .lt("snapshot_date", today)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(`[snapshots] read failed for ${agentId}:`, error.message);
    return null;
  }
  if (!data) return null;
  return {
    audit_ready_mwp: Number(data.audit_ready_mwp ?? 0),
    onboarding_mwp: Number(data.onboarding_mwp ?? 0),
    pending_signature_mwp: Number(data.pending_signature_mwp ?? 0),
    signed_this_week_mwp: Number(data.signed_this_week_mwp ?? 0),
    new_proposals_count: Number(data.new_proposals_count ?? 0),
    estimated_commission_2026: Number(data.estimated_commission_2026 ?? 0),
    estimated_commission_2025_2030: Number(data.estimated_commission_2025_2030 ?? 0),
  };
}

/**
 * Upsert today's snapshot for an agent. Idempotent per (agent_id, snapshot_date).
 */
export async function writeSnapshot(
  supabase: ReturnType<typeof createClient>,
  agentId: string,
  snap: AgentSnapshot
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("agent_weekly_snapshots")
    .upsert(
      {
        agent_id: agentId,
        snapshot_date: today,
        ...snap,
      },
      { onConflict: "agent_id,snapshot_date" }
    );
  if (error) {
    console.error(`[snapshots] write failed for ${agentId}:`, error.message);
  }
}

export function computeDeltas(current: AgentSnapshot, previous: AgentSnapshot | null): AgentDeltas {
  const keys = Object.keys(current) as (keyof AgentSnapshot)[];
  const out = {} as AgentDeltas;
  for (const k of keys) {
    const cur = current[k];
    out[k] = {
      value: cur,
      delta: previous ? cur - previous[k] : 0,
      has_baseline: !!previous,
    };
  }
  return out;
}
