// Cora autonomous-action guard.
// Single source of truth for: mailbox health, emergency stop, pause flags,
// autopilot mode, and decision-log writes. Every Cora send/auto-action path
// MUST call `assertCoraCanAct` before sending, and `logCoraDecision` after.
//
// Outlook-only: Cora may never send through Resend or any other mailer.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export const CORA_MAILBOX = "cora@crunchcarbon.com";

export type SupabaseSR = ReturnType<typeof createClient>;

export function getServiceClient(): SupabaseSR {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export interface CoraGateResult {
  allowed: boolean;
  blocker?: string;
  reason?: string;
  settings?: any;
  mailbox?: any;
}

/** Check global Cora gating: mailbox verified, not paused/stopped. */
export async function assertCoraCanAct(
  supabase: SupabaseSR,
  opts: { requireMailbox?: boolean } = {},
): Promise<CoraGateResult> {
  const requireMailbox = opts.requireMailbox !== false;

  const { data: settings } = await supabase
    .from("sales_agent_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();

  if (settings?.emergency_stop) {
    return { allowed: false, blocker: "emergency_stop", reason: "Emergency stop is engaged.", settings };
  }
  if (settings?.pause_all_sending) {
    return { allowed: false, blocker: "pause_all_sending", reason: "All sending is paused.", settings };
  }
  if (settings?.autopilot_status === "off") {
    return { allowed: false, blocker: "autopilot_off", reason: "Autopilot is off.", settings };
  }

  if (requireMailbox) {
    const { data: mailbox } = await supabase
      .from("cora_mailbox_status")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    if (!mailbox || mailbox.outcome !== "verified") {
      return {
        allowed: false,
        blocker: "mailbox_unavailable",
        reason: mailbox?.error || "Cora's Outlook mailbox is not verified.",
        settings,
        mailbox,
      };
    }
    return { allowed: true, settings, mailbox };
  }

  return { allowed: true, settings };
}

export interface DecisionLogEntry {
  candidate_id?: string | null;
  lead_id?: string | null;
  action: string;
  reason?: string | null;
  data_used?: Record<string, unknown> | null;
  confidence?: number | null;
  prompt_version?: string | null;
  variant_id?: string | null;
  sending_mailbox?: string | null;
  outlook_message_id?: string | null;
  outlook_thread_id?: string | null;
  duplicate_check_result?: Record<string, unknown> | null;
  relationship_check_result?: Record<string, unknown> | null;
  status_before?: string | null;
  status_after?: string | null;
  admin_override?: boolean;
}

export async function logCoraDecision(
  supabase: SupabaseSR,
  entry: DecisionLogEntry,
): Promise<void> {
  try {
    await supabase.from("cora_decision_log").insert(entry as any);
    if (entry.candidate_id) {
      await supabase
        .from("discovery_candidates")
        .update({ last_cora_decision_at: new Date().toISOString() })
        .eq("id", entry.candidate_id);
    }
  } catch (e) {
    console.error("logCoraDecision failed", e);
  }
}
