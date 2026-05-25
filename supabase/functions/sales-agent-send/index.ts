// Sales Agent — outreach sequence dispatcher.
// Runs on cron (every 15 min). For each active enrollment whose next_send_at
// has passed, renders the step body with personalization and sends via Resend.
// Stops the sequence when the lead replies / is converted / bounces.
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

interface Step {
  day_offset: number;
  subject: string;
  body_template: string;
  cta_label?: string;
  cta_url?: string;
}

function renderTemplate(tpl: string, lead: any): string {
  const first = (lead.contact_name || "there").split(" ")[0];
  return tpl
    .replaceAll("{{company_name}}", lead.company_name || "your company")
    .replaceAll("{{first_name}}", first)
    .replaceAll("{{contact_name}}", lead.contact_name || "there")
    .replaceAll("{{location}}", lead.location || "your region");
}

function bodyToHtml(body: string, cta?: { label?: string; url?: string }): string {
  const paragraphs = body.split("\n\n").map((p) => `<p style="margin:0 0 14px 0;line-height:1.6;color:#1a1a1a;">${p.replace(/\n/g, "<br/>")}</p>`).join("");
  const button = cta?.url && cta?.label
    ? `<p style="margin:24px 0;"><a href="${cta.url}" style="background:#1A1A1A;color:#FFBF00;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">${cta.label}</a></p>`
    : "";
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;">${paragraphs}${button}</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });
  const runStart = new Date().toISOString();
  const { data: runRow } = await supabase.from("sales_agent_runs").insert({ job_name: "send", status: "running", started_at: runStart }).select().single();
  const runId = runRow?.id;
  const stats = { processed: 0, sent: 0, failed: 0, skipped: 0, completed: 0, halted: 0 };

  try {
    const { data: settings } = await supabase.from("sales_agent_settings").select("*").eq("id", true).maybeSingle();
    const dailyCap = settings?.daily_send_cap ?? 50;
    const quietStart = settings?.quiet_hours_start ?? 20;
    const quietEnd = settings?.quiet_hours_end ?? 8;
    const blockedDomains: string[] = settings?.blocked_domains ?? [];

    // Quiet hours check (UTC)
    const hour = new Date().getUTCHours();
    const inQuiet = quietStart < quietEnd ? (hour >= quietStart && hour < quietEnd) : (hour >= quietStart || hour < quietEnd);
    if (inQuiet) {
      await supabase.from("sales_agent_runs").update({ status: "completed", completed_at: new Date().toISOString(), stats: { ...stats, skipped_quiet_hours: true } }).eq("id", runId);
      return new Response(JSON.stringify({ ok: true, skipped: "quiet_hours" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Daily cap (sent today)
    const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
    const { count: sentToday } = await supabase
      .from("lead_outreach_history").select("*", { count: "exact", head: true })
      .gte("sent_at", todayStart.toISOString()).eq("status", "sent");
    const remaining = Math.max(0, dailyCap - (sentToday ?? 0));
    if (remaining <= 0) {
      await supabase.from("sales_agent_runs").update({ status: "completed", completed_at: new Date().toISOString(), stats: { ...stats, daily_cap_hit: true } }).eq("id", runId);
      return new Response(JSON.stringify({ ok: true, skipped: "daily_cap" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pick due enrollments (batch of remaining cap, max 10 per run)
    const batchSize = Math.min(remaining, 10);
    const { data: due } = await supabase
      .from("outreach_enrollments")
      .select("id, lead_id, sequence_id, current_step, status, agent_leads!inner(id,company_name,contact_name,email,website,location,notes,status), outreach_sequences!inner(id,name,steps,is_active)")
      .eq("status", "active")
      .lte("next_send_at", new Date().toISOString())
      .limit(batchSize);

    for (const enr of due ?? []) {
      stats.processed++;
      const lead: any = (enr as any).agent_leads;
      const seq: any = (enr as any).outreach_sequences;
      const steps: Step[] = seq?.steps ?? [];

      // Halt conditions
      if (!seq?.is_active || !lead?.email || ["qualified", "converted", "rejected"].includes(lead?.status)) {
        await supabase.from("outreach_enrollments").update({ status: "stopped", paused_reason: "lead status changed or sequence inactive", completed_at: new Date().toISOString() }).eq("id", enr.id);
        stats.halted++;
        continue;
      }

      const domain = (lead.email.split("@")[1] || "").toLowerCase();
      if (blockedDomains.some((d) => domain === d.toLowerCase() || domain.endsWith(`.${d.toLowerCase()}`))) {
        await supabase.from("outreach_enrollments").update({ status: "stopped", paused_reason: "blocked domain", completed_at: new Date().toISOString() }).eq("id", enr.id);
        stats.halted++;
        continue;
      }

      // Suppression check
      const { data: suppressed } = await supabase.from("client_email_suppressions").select("id").eq("email", lead.email.toLowerCase()).maybeSingle();
      if (suppressed) {
        await supabase.from("outreach_enrollments").update({ status: "stopped", paused_reason: "email suppressed", completed_at: new Date().toISOString() }).eq("id", enr.id);
        stats.halted++;
        continue;
      }

      const step = steps[enr.current_step];
      if (!step) {
        await supabase.from("outreach_enrollments").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", enr.id);
        stats.completed++;
        continue;
      }

      try {
        const subject = renderTemplate(step.subject, lead);
        const bodyText = renderTemplate(step.body_template, lead);
        const html = bodyToHtml(bodyText, { label: step.cta_label, url: step.cta_url });

        const send = await resend.emails.send({
          from: "Shaun Slabber <shaun@crunchcarbon.com>",
          to: [lead.email],
          subject,
          html,
        });

        await supabase.from("lead_outreach_history").insert({
          lead_id: lead.id,
          template_type: `sequence:${seq.name}:step${enr.current_step + 1}`,
          subject,
          body_preview: bodyText.substring(0, 200),
          resend_message_id: send.data?.id ?? null,
          status: "sent",
        });

        // Update lead counters
        const { data: cur } = await supabase.from("agent_leads").select("outreach_count").eq("id", lead.id).single();
        await supabase.from("agent_leads").update({
          outreach_count: (cur?.outreach_count ?? 0) + 1,
          last_outreach_at: new Date().toISOString(),
          status: lead.status === "new" ? "contacted" : lead.status,
        }).eq("id", lead.id);

        // Advance enrollment
        const nextStep = enr.current_step + 1;
        const next = steps[nextStep];
        const updates: any = { current_step: nextStep };
        if (next) {
          updates.next_send_at = new Date(Date.now() + (next.day_offset - step.day_offset) * 86400 * 1000).toISOString();
        } else {
          updates.status = "completed";
          updates.completed_at = new Date().toISOString();
          stats.completed++;
        }
        await supabase.from("outreach_enrollments").update(updates).eq("id", enr.id);
        stats.sent++;
      } catch (e) {
        console.error("send failed", enr.id, e);
        stats.failed++;
        await supabase.from("outreach_enrollments").update({ status: "paused", paused_reason: `send error: ${e instanceof Error ? e.message : "unknown"}` }).eq("id", enr.id);
      }

      await new Promise((r) => setTimeout(r, 600));
    }

    await supabase.from("sales_agent_runs").update({ status: "completed", completed_at: new Date().toISOString(), stats }).eq("id", runId);
    return new Response(JSON.stringify({ ok: true, stats }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("sales-agent-send error", e);
    await supabase.from("sales_agent_runs").update({ status: "failed", completed_at: new Date().toISOString(), error: e instanceof Error ? e.message : "unknown", stats }).eq("id", runId);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
