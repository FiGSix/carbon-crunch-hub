// Outbound email alerts for the Sales Agent (cron every 15 min).
// Debounced via notification_state. Sends via send-transactional-email if
// available, otherwise direct Outlook /me/sendMail.
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

async function sendOutlook(to: string, subject: string, html: string) {
  if (!LOVABLE_API_KEY || !OUTLOOK_API_KEY) return { ok: false, error: "missing keys" };
  const res = await fetch(`${OUTLOOK_GATEWAY}/me/sendMail`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": OUTLOOK_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: { subject, body: { contentType: "HTML", content: html }, toRecipients: [{ emailAddress: { address: to } }] },
      saveToSentItems: false,
    }),
  });
  return { ok: res.ok || res.status === 202, status: res.status };
}

function inQuietHours(quiet: any): boolean {
  if (!quiet) return false;
  const tz = quiet.tz || "UTC";
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
    const [hh, mm] = fmt.format(new Date()).split(":").map((s) => parseInt(s));
    const cur = hh * 60 + mm;
    const [sh, sm] = (quiet.start ?? "18:00").split(":").map((s: string) => parseInt(s));
    const [eh, em] = (quiet.end ?? "07:00").split(":").map((s: string) => parseInt(s));
    const start = sh * 60 + sm, end = eh * 60 + em;
    return start < end ? (cur >= start && cur < end) : (cur >= start || cur < end);
  } catch { return false; }
}

async function maybeSend(supabase: any, eventKey: string, to: string, subject: string, html: string, count: number, minIntervalH: number) {
  const { data: st } = await supabase.from("notification_state").select("*").eq("event_key", eventKey).maybeSingle();
  const now = Date.now();
  if (st?.last_sent_at) {
    const elapsed = now - new Date(st.last_sent_at).getTime();
    if (elapsed < minIntervalH * 3600 * 1000 && (st.last_count ?? 0) >= count) return false;
  }
  const r = await sendOutlook(to, subject, html);
  await supabase.from("notification_state").upsert({
    event_key: eventKey, last_sent_at: new Date().toISOString(), last_count: count, updated_at: new Date().toISOString(),
  }, { onConflict: "event_key" });
  return r.ok;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const { data: settings } = await supabase.from("sales_agent_settings").select("*").eq("id", true).maybeSingle();
    if (!settings?.notify_enabled) return new Response(JSON.stringify({ ok: true, skipped: "disabled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (inQuietHours(settings.notify_quiet_hours)) return new Response(JSON.stringify({ ok: true, skipped: "quiet" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const to = settings.notify_email || "shaun@crunchcarbon.com";
    const minH = settings.notify_min_interval_hours ?? 6;
    const stats: any = { sent: [] };
    const baseStyle = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;";

    // 1. Pending approval queue
    const { count: pending } = await supabase.from("discovery_candidates").select("id", { count: "exact", head: true }).eq("status", "pending");
    if (pending !== null && pending >= (settings.notify_pending_threshold ?? 10)) {
      const html = `<html><body style="${baseStyle}"><h2 style="margin-top:0;">${pending} candidates waiting for review</h2><p>The Sales Agent approval queue has ${pending} pending candidates.</p><p><a href="https://crunchcarbon.com/admin/sales-agent" style="background:#1A1A1A;color:#FFBF00;padding:10px 20px;text-decoration:none;border-radius:6px;">Open Approval Queue</a></p></body></html>`;
      const sent = await maybeSend(supabase, "pending_alert", to, `[Sales Agent] ${pending} candidates waiting`, html, pending, minH);
      if (sent) stats.sent.push("pending_alert");
    }

    // 2. Unhandled inbound
    const { count: inbox } = await supabase.from("inbound_messages").select("id", { count: "exact", head: true }).is("processed_at", null);
    if (inbox !== null && inbox >= (settings.notify_inbox_threshold ?? 5)) {
      const html = `<html><body style="${baseStyle}"><h2 style="margin-top:0;">${inbox} unread replies</h2><p>The Sales Agent inbox has ${inbox} unprocessed inbound replies.</p><p><a href="https://crunchcarbon.com/admin/sales-agent" style="background:#1A1A1A;color:#FFBF00;padding:10px 20px;text-decoration:none;border-radius:6px;">Open Inbox</a></p></body></html>`;
      const sent = await maybeSend(supabase, "inbox_alert", to, `[Sales Agent] ${inbox} replies to handle`, html, inbox, minH);
      if (sent) stats.sent.push("inbox_alert");
    }

    // 3. New meetings booked in last interval
    const sinceMeetings = new Date(Date.now() - minH * 3600 * 1000).toISOString();
    const { data: newMeetings } = await supabase.from("meetings").select("scheduled_at, teams_join_url, lead_id, agent_leads:lead_id(company_name,contact_name,email)").gte("created_at", sinceMeetings).eq("status", "scheduled");
    if (newMeetings && newMeetings.length > 0) {
      const rows = newMeetings.map((m: any) => `<li><b>${m.agent_leads?.company_name ?? m.lead_id}</b> — ${new Date(m.scheduled_at).toUTCString()}${m.teams_join_url ? ` · <a href="${m.teams_join_url}">Join</a>` : ""}</li>`).join("");
      const html = `<html><body style="${baseStyle}"><h2 style="margin-top:0;">${newMeetings.length} new meeting(s) booked</h2><ul>${rows}</ul></body></html>`;
      // event key includes day so it can resend next day even with same count
      const key = `meetings_${new Date().toISOString().slice(0, 13)}`;
      const sent = await maybeSend(supabase, key, to, `[Sales Agent] ${newMeetings.length} new meeting(s) booked`, html, newMeetings.length, 0);
      if (sent) stats.sent.push("meetings_alert");
    }

    // 4. Daily digest (once per day, at 06-08 UTC)
    if (settings.notify_daily_digest) {
      const hourUtc = new Date().getUTCHours();
      if (hourUtc >= 6 && hourUtc < 8) {
        const dayKey = `digest_${new Date().toISOString().slice(0, 10)}`;
        const { data: existing } = await supabase.from("notification_state").select("last_sent_at").eq("event_key", dayKey).maybeSingle();
        if (!existing) {
          const since24 = new Date(Date.now() - 86400 * 1000).toISOString();
          const [{ count: sent24 }, { count: replies24 }, { count: meet24 }] = await Promise.all([
            supabase.from("lead_outreach_history").select("id", { count: "exact", head: true }).gte("sent_at", since24).eq("status", "sent"),
            supabase.from("inbound_messages").select("id", { count: "exact", head: true }).gte("received_at", since24),
            supabase.from("meetings").select("id", { count: "exact", head: true }).gte("created_at", since24),
          ]);
          const html = `<html><body style="${baseStyle}"><h2 style="margin-top:0;">Daily digest</h2><ul><li>Emails sent (24h): <b>${sent24 ?? 0}</b></li><li>Replies received (24h): <b>${replies24 ?? 0}</b></li><li>Meetings booked (24h): <b>${meet24 ?? 0}</b></li><li>Queue: <b>${pending ?? 0}</b> pending · <b>${inbox ?? 0}</b> unread inbox</li></ul><p><a href="https://crunchcarbon.com/admin/sales-agent">Open Sales Agent</a></p></body></html>`;
          const r = await sendOutlook(to, `[Sales Agent] Daily digest — ${new Date().toISOString().slice(0, 10)}`, html);
          await supabase.from("notification_state").upsert({ event_key: dayKey, last_sent_at: new Date().toISOString(), last_count: (sent24 ?? 0) + (replies24 ?? 0) + (meet24 ?? 0) });
          if (r.ok) stats.sent.push("daily_digest");
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, stats }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("notify error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
