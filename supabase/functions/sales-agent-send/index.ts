// Sales Agent — outreach sequence dispatcher (Phase 3: via Microsoft Outlook).
// Runs on cron. For each due active enrollment renders the step body, injects
// the MS Bookings link, and sends via the Outlook connector gateway.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const OUTLOOK_API_KEY = Deno.env.get("MICROSOFT_OUTLOOK_API_KEY");
const OUTLOOK_GATEWAY = "https://connector-gateway.lovable.dev/microsoft_outlook";

interface Step {
  day_offset: number;
  subject: string;
  body_template: string;
  cta_label?: string;
  cta_url?: string;
}

function renderTemplate(tpl: string, lead: any, settings: any): string {
  const first = (lead.contact_name || "there").split(" ")[0];
  return tpl
    .replaceAll("{{company_name}}", lead.company_name || "your company")
    .replaceAll("{{first_name}}", first)
    .replaceAll("{{contact_name}}", lead.contact_name || "there")
    .replaceAll("{{location}}", lead.location || "your region")
    .replaceAll("{{bookings_url}}", settings?.bookings_url || "")
    .replaceAll("{{bookings_cta_label}}", settings?.bookings_cta_label || "Book a meeting");
}

function bodyToHtml(body: string, cta?: { label?: string; url?: string }, bookings?: { url?: string; label?: string }): string {
  const paragraphs = body.split("\n\n").map((p) => `<p style="margin:0 0 14px 0;line-height:1.6;color:#1a1a1a;">${p.replace(/\n/g, "<br/>")}</p>`).join("");
  const primary = cta?.url && cta?.label
    ? `<p style="margin:24px 0;"><a href="${cta.url}" style="background:#1A1A1A;color:#FFBF00;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">${cta.label}</a></p>`
    : "";
  const bookingsBtn = bookings?.url
    ? `<p style="margin:20px 0;"><a href="${bookings.url}" style="background:#FFBF00;color:#1A1A1A;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">${bookings.label ?? "Pick a 30-min slot"}</a></p>`
    : "";
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;">${paragraphs}${primary}${bookingsBtn}</body></html>`;
}

async function sendViaOutlook(to: string, subject: string, html: string): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  if (!LOVABLE_API_KEY) return { ok: false, error: "LOVABLE_API_KEY missing" };
  if (!OUTLOOK_API_KEY) return { ok: false, error: "MICROSOFT_OUTLOOK_API_KEY missing" };
  const res = await fetch(`${OUTLOOK_GATEWAY}/me/sendMail`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": OUTLOOK_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: "HTML", content: html },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: true,
    }),
  });
  if (!res.ok && res.status !== 202) {
    const text = await res.text();
    return { ok: false, error: `Outlook sendMail [${res.status}]: ${text}` };
  }
  // /me/sendMail returns 202 with no body; no message id available without a follow-up
  return { ok: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });
  const runStart = new Date().toISOString();
  const { data: runRow } = await supabase.from("sales_agent_runs").insert({ job_name: "send", status: "running", started_at: runStart }).select().single();
  const runId = runRow?.id;
  const stats: any = { processed: 0, sent: 0, failed: 0, skipped: 0, completed: 0, halted: 0 };

  try {
    const { data: settings } = await supabase.from("sales_agent_settings").select("*").eq("id", true).maybeSingle();
    if (settings && settings.autopilot_outreach === false) {
      await supabase.from("sales_agent_runs").update({ status: "completed", completed_at: new Date().toISOString(), stats: { ...stats, skipped: "autopilot_off" } }).eq("id", runId);
      return new Response(JSON.stringify({ ok: true, skipped: "autopilot_off" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const dailyCap = settings?.daily_send_cap ?? 50;
    const quietStart = settings?.quiet_hours_start ?? 20;
    const quietEnd = settings?.quiet_hours_end ?? 8;
    const blockedDomains: string[] = settings?.blocked_domains ?? [];

    const hour = new Date().getUTCHours();
    const inQuiet = quietStart < quietEnd ? (hour >= quietStart && hour < quietEnd) : (hour >= quietStart || hour < quietEnd);
    if (inQuiet) {
      await supabase.from("sales_agent_runs").update({ status: "completed", completed_at: new Date().toISOString(), stats: { ...stats, skipped_quiet_hours: true } }).eq("id", runId);
      return new Response(JSON.stringify({ ok: true, skipped: "quiet_hours" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
    const { count: sentToday } = await supabase
      .from("lead_outreach_history").select("*", { count: "exact", head: true })
      .gte("sent_at", todayStart.toISOString()).eq("status", "sent");
    const remaining = Math.max(0, dailyCap - (sentToday ?? 0));
    if (remaining <= 0) {
      await supabase.from("sales_agent_runs").update({ status: "completed", completed_at: new Date().toISOString(), stats: { ...stats, daily_cap_hit: true } }).eq("id", runId);
      return new Response(JSON.stringify({ ok: true, skipped: "daily_cap" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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
        const subject = renderTemplate(step.subject, lead, settings);
        const bodyText = renderTemplate(step.body_template, lead, settings);
        const html = bodyToHtml(
          bodyText,
          step.cta_url ? { label: step.cta_label, url: step.cta_url } : undefined,
          settings?.bookings_url ? { url: settings.bookings_url, label: settings.bookings_cta_label } : undefined,
        );

        const send = await sendViaOutlook(lead.email, subject, html);
        if (!send.ok) throw new Error(send.error || "send failed");

        await supabase.from("lead_outreach_history").insert({
          lead_id: lead.id,
          template_type: `sequence:${seq.name}:step${enr.current_step + 1}`,
          subject,
          body_preview: bodyText.substring(0, 200),
          resend_message_id: null,
          status: "sent",
        });

        const { data: cur } = await supabase.from("agent_leads").select("outreach_count").eq("id", lead.id).single();
        await supabase.from("agent_leads").update({
          outreach_count: (cur?.outreach_count ?? 0) + 1,
          last_outreach_at: new Date().toISOString(),
          status: lead.status === "new" ? "contacted" : lead.status,
        }).eq("id", lead.id);

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
