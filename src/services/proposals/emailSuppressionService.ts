import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface SuppressionRecord {
  id: string;
  email: string;
  reason: string;
  notes: string | null;
  source: string | null;
  created_by: string | null;
  created_at: string;
}

/**
 * Check if an email is on the suppression list.
 * Uses the SECURITY DEFINER RPC so it works regardless of caller role.
 */
export async function isEmailSuppressed(email: string): Promise<boolean> {
  if (!email) return false;
  const { data, error } = await supabase.rpc("is_client_email_suppressed", {
    p_email: email,
  });
  if (error) {
    logger.warn("isEmailSuppressed RPC failed", { error });
    return false;
  }
  return Boolean(data);
}

/**
 * Fetch the suppression record for an email (admin-only via RLS).
 */
export async function getEmailSuppression(
  email: string
): Promise<SuppressionRecord | null> {
  if (!email) return null;
  const { data, error } = await (supabase as any)
    .from("client_email_suppressions")
    .select("id,email,reason,notes,source,created_by,created_at")
    .ilike("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    logger.warn("getEmailSuppression failed", { error });
    return null;
  }
  return (data as SuppressionRecord) ?? null;
}
