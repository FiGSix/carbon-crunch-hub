// Sales Agent — onboarding nudge cron.
// Once a day, finds invited agents whose onboarding is stalled (< Audit Ready)
// and sends a contextual reminder email.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Don't nudge more than once every N days per agent
const NUDGE_COOLDOWN_DAYS = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: runRow } = await supabase.from("sales_agent_runs").insert({ job_name: "nudge", status: "running" }).select().single();
  const runId = runRow?.id;
  const stats = { candidates: 0, sent: 0, skipped: 0, failed: 0 };

  try {
    // Agents who accepted invite but onboarding not audit_ready
    const { data: agents } = await supabase
      .from("profiles")
      .select("id,email,first_name,last_name,role,created_at")
      .eq("role", "agent");

    for (const a of agents ?? []) {
      // Check if any onboarding for this agent is audit_ready already
      const { data: po } = await supabase
        .from("project_onboarding")
        .select("status, proposal_id, proposals!inner(agent_id)")
        .eq("proposals.agent_id", a.id);

      const hasAudit = (po ?? []).some((r: any) => r.status === "audit_ready");
      if (hasAudit) continue;

      stats.candidates++;
      // Cooldown — check last nudge in lead_outreach_history with template_type starting nudge:
      const cutoff = new Date(Date.now() - NUDGE_COOLDOWN_DAYS * 86400 * 1000).toISOString();
      const { data: recent } = await supabase
        .from("lead_outreach_history").select("id")
        .eq("subject", `Nudge for ${a.email}`)
        .gte("sent_at", cutoff).limit(1);
      if ((recent ?? []).length > 0) { stats.skipped++; continue; }

      const firstName = a.first_name || (a.email?.split("@")[0] ?? "there");
      const subject = `${firstName}, finish your CrunchCarbon setup to start earning`;
      const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <p>Hi ${firstName},</p>
        <p>You're a few steps away from being Audit Ready on CrunchCarbon — once complete, you can start submitting solar projects for carbon-credit revenue.</p>
        <p><a href="https://crunchcarbon.com/onboarding" style="background:#1A1A1A;color:#FFBF00;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">Finish onboarding</a></p>
        <p style="color:#666;font-size:13px;">This is an automated reminder. Reply STOP to opt out.</p>
      </body></html>`;

      try {
        await resend.emails.send({
          from: "Shaun Slabber <shaun@crunchcarbon.com>",
          to: [a.email],
          subject,
          html,
        });
        stats.sent++;
      } catch (e) {
        console.error("nudge send failed", a.email, e);
        stats.failed++;
      }
      await new Promise((r) => setTimeout(r, 400));
    }

    await supabase.from("sales_agent_runs").update({ status: "completed", completed_at: new Date().toISOString(), stats }).eq("id", runId);
    return new Response(JSON.stringify({ ok: true, stats }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    await supabase.from("sales_agent_runs").update({ status: "failed", completed_at: new Date().toISOString(), error: String(e), stats }).eq("id", runId);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
