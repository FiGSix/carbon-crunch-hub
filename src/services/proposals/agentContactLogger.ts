import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface AgentContactLogOptions {
  proposalId: string;
  userId: string;
  triggerEvent?: string;
  details?: Record<string, unknown>;
}

/**
 * Log a manual agent contact event to proposal_automation_log.
 * This powers the learning_metrics.agent_touch_to_sign_pct KPI.
 */
export async function logManualAgentContact(
  options: AgentContactLogOptions
): Promise<void> {
  const { proposalId, userId, triggerEvent, details } = options;

  const logLogger = logger.withContext({
    component: "AgentContactLogger",
    method: "logManualAgentContact",
    proposalId,
    userId,
  });

  try {
    const { error } = await supabase.from("proposal_automation_log").insert({
      proposal_id: proposalId,
      automation_type: "manual_agent_contact",
      trigger_event: triggerEvent ?? "agent_initiated",
      created_by: userId,
      details: details ?? {},
    });

    if (error) {
      logLogger.warn("Failed to insert manual_agent_contact log", {
        error: error.message,
      });
      // Non-fatal: don't block the user action
    } else {
      logLogger.info("Manual agent contact logged");
    }
  } catch (err) {
    logLogger.warn("Exception logging manual agent contact", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
