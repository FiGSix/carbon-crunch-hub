// Poll the Outlook inbox for replies and MS Bookings confirmations.
// Runs on cron every 5 minutes. Inserts dedup'd inbound_messages rows and
// triggers classification + meeting parsing.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { LEAD_SUBJECT_PREFIX, fetchAttachments, parseAttachment, parseBody, ingestLeads, buildSummary, type ParsedLeadRow } from "../_shared/lead-ingest.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const OUTLOOK_API_KEY = Deno.env.get("MICROSOFT_OUTLOOK_API_KEY")!;
const OUTLOOK_GATEWAY = "https://connector-gateway.lovable.dev/microsoft_outlook";

function stripHtml(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").trim();
}

function isBookingConfirmation(subject: string, fromEmail: string): boolean {
  const s = subject.toLowerCase();
  return /\b(new booking|booking confirmation|updated booking|canceled|cancelled|appointment)\b/.test(s)
    || /microsoftbookings|noreply@.*bookings|noreply@email\.teams\.microsoft\.com/i.test(fromEmail);
}

function extractTeamsJoinUrl(text: string): string | null {
  const m = text.match(/https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s"'<>)]+/);
  return m ? m[0] : null;
}

function extractMeetingTime(text: string): string | null {
  // very loose ISO-ish or "Tue, Mar 18, 2026 09:00 AM (UTC+02:00)" parsing
  // try ISO first
  const iso = text.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:?\d{2}|Z)?)/);
  if (iso) {
    const d = new Date(iso[1]);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  // generic "Month dd, yyyy hh:mm" patterns
  const m = text.match(/([A-Z][a-z]{2,9}\s+\d{1,2},?\s+\d{4}[^\n]*?\d{1,2}:\d{2}\s*(?:AM|PM)?)/);
  if (m) {
    const d = new Date(m[1]);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: settings } = await supabase.from("sales_agent_settings").select("last_inbound_poll_at, mailbox_address").eq("id", true).maybeSingle();
  const sinceRaw = settings?.last_inbound_poll_at ?? new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  // Microsoft Graph requires DateTimeOffset format: yyyy-MM-ddTHH:mm:ssZ (no fractional seconds, with Z)
  const since = new Date(sinceRaw).toISOString().replace(/\.\d{3}Z$/, "Z");
  const stats: any = { fetched: 0, inserted: 0, meetings: 0, classified: 0 };

  try {
    const url = `${OUTLOOK_GATEWAY}/me/mailFolders/inbox/messages?$top=50&$orderby=receivedDateTime asc&$filter=receivedDateTime gt ${since}&$select=id,conversationId,from,subject,bodyPreview,body,receivedDateTime,internetMessageHeaders`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": OUTLOOK_API_KEY,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Outlook list messages [${res.status}]: ${text}`);
    }
    const json = await res.json();
    const messages: any[] = json.value ?? [];
    stats.fetched = messages.length;

    let maxReceived = since;
    for (const m of messages) {
      if (m.receivedDateTime && m.receivedDateTime > maxReceived) maxReceived = m.receivedDateTime;

      const fromEmail = m.from?.emailAddress?.address?.toLowerCase() ?? "";
      const fromName = m.from?.emailAddress?.name ?? null;
      const subject = m.subject ?? "";
      const html = m.body?.contentType === "HTML" ? (m.body?.content ?? "") : null;
      const text = html ? stripHtml(html) : (m.body?.content ?? m.bodyPreview ?? "");

      // skip our own outbound (mailbox address) and known no-reply that aren't bookings
      const mailbox = (settings?.mailbox_address ?? "").toLowerCase();
      if (fromEmail && fromEmail === mailbox) continue;

      // find lead by from email
      const { data: lead } = await supabase.from("agent_leads").select("id").eq("email", fromEmail).maybeSingle();
      let enrollmentId: string | null = null;
      if (lead?.id) {
        const { data: enr } = await supabase.from("outreach_enrollments")
          .select("id").eq("lead_id", lead.id).order("enrolled_at", { ascending: false }).limit(1).maybeSingle();
        enrollmentId = enr?.id ?? null;
      }

      // upsert by graph_message_id
      const { data: inserted, error: insErr } = await supabase.from("inbound_messages").upsert({
        graph_message_id: m.id,
        conversation_id: m.conversationId ?? null,
        from_email: fromEmail || "unknown@unknown",
        from_name: fromName,
        subject,
        body_text: text?.substring(0, 50000) ?? null,
        body_html: html?.substring(0, 200000) ?? null,
        headers: m.internetMessageHeaders ?? {},
        received_at: m.receivedDateTime,
        lead_id: lead?.id ?? null,
        enrollment_id: enrollmentId,
      }, { onConflict: "graph_message_id", ignoreDuplicates: false }).select().single();

      if (insErr) { console.error("inbound upsert", insErr); continue; }
      stats.inserted++;

      // MS Bookings confirmation parsing
      if (isBookingConfirmation(subject, fromEmail)) {
        const joinUrl = extractTeamsJoinUrl(text + " " + (html ?? ""));
        const scheduledAt = extractMeetingTime(text);
        // Attendee email might not be the from address (booking from Microsoft).
        // Look for the lead email inside the body.
        const bodyLower = text.toLowerCase();
        const { data: candLeads } = await supabase.from("agent_leads")
          .select("id,email,status").not("email", "is", null).limit(2000);
        const matched = (candLeads ?? []).find((l: any) => l.email && bodyLower.includes(l.email.toLowerCase()));

        if (scheduledAt && matched) {
          await supabase.from("meetings").insert({
            lead_id: matched.id,
            scheduled_at: scheduledAt,
            teams_join_url: joinUrl,
            source: 'ms_bookings',
            raw_confirmation_message_id: inserted.id,
            status: /cancel/i.test(subject) ? 'cancelled' : 'scheduled',
          });
          await supabase.from("agent_leads").update({ status: 'meeting_booked' }).eq("id", matched.id);
          await supabase.from("candidate_notes").insert({
            lead_id: matched.id,
            author_role: 'system',
            kind: 'system_event',
            body: `MS Bookings: ${/cancel/i.test(subject) ? 'meeting cancelled' : `meeting booked for ${new Date(scheduledAt).toUTCString()}`}${joinUrl ? ' (Teams link captured)' : ''}.`,
          });
          stats.meetings++;
        }
        await supabase.from("inbound_messages").update({ intent: 'meeting_booked', confidence: 95, processed_at: new Date().toISOString() }).eq("id", inserted.id);
        continue;
      }

      // Trigger AI classification for normal replies tied to an enrollment
      if (enrollmentId) {
        try {
          await supabase.functions.invoke("sales-agent-classify-reply", { body: { inbound_message_id: inserted.id } });
          stats.classified++;
        } catch (e) {
          console.error("classify invoke failed", e);
        }
      }
    }

    await supabase.from("sales_agent_settings").update({ last_inbound_poll_at: maxReceived }).eq("id", true);
    return new Response(JSON.stringify({ ok: true, stats, since, until: maxReceived }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("poll-inbound error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e), stats }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
