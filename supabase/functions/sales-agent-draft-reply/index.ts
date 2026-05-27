// Draft (and optionally send) an AI reply to an inbound message.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { coraSignatureHtml } from "../_shared/coraSignature.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const OUTLOOK_API_KEY = Deno.env.get("MICROSOFT_OUTLOOK_API_KEY")!;
const OUTLOOK_GATEWAY = "https://connector-gateway.lovable.dev/microsoft_outlook";

function wrapHtml(body: string, bookingsUrl?: string, ctaLabel?: string): string {
  const paragraphs = body.split("\n\n").map((p) => `<p style="margin:0 0 14px 0;line-height:1.6;">${p.replace(/\n/g, "<br/>")}</p>`).join("");
  const btn = bookingsUrl
    ? `<p style="margin:20px 0;"><a href="${bookingsUrl}" style="background:#FFBF00;color:#1A1A1A;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">${ctaLabel ?? "Pick a 30-min slot"}</a></p>`
    : "";
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;">${paragraphs}${btn}${coraSignatureHtml()}</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const { inbound_message_id, auto_send } = await req.json();
    const { data: msg, error } = await supabase.from("inbound_messages").select("*").eq("id", inbound_message_id).single();
    if (error || !msg) throw new Error("inbound message not found");

    const { data: settings } = await supabase.from("sales_agent_settings").select("bookings_url,bookings_cta_label,mailbox_address,ai_style_notes").eq("id", true).maybeSingle();

    // Pull recent winning replies (sent replies whose lead later became qualified/converted) as few-shot examples.
    const { data: winners } = await supabase
      .from("outreach_replies")
      .select("sent_body, lead_id, agent_leads!inner(status)")
      .eq("status", "sent")
      .in("agent_leads.status", ["qualified", "converted", "invited"])
      .not("sent_body", "is", null)
      .order("sent_at", { ascending: false })
      .limit(3);
    const examples = (winners ?? [])
      .map((w: any, i: number) => `Example ${i + 1} (worked well):\n${(w.sent_body ?? "").substring(0, 600)}`)
      .join("\n\n---\n\n");

    const styleNotes = settings?.ai_style_notes ? `\n\nStyle rules learned from past admin edits:\n${settings.ai_style_notes}` : "";
    const examplesBlock = examples ? `\n\n${examples}` : "";

    const sys = `You are Cora Black, Partner Co-ordinator at Crunch Carbon. You coordinate intros between solar EPCs / installers and Shaun Slabber (CEO). Draft a short, sharp reply to the prospect's email.

Voice:
- Confident, efficient, warm-but-controlled, action-led, subtly premium.
- 60–110 words, 2–3 short paragraphs, plain text.
- No hype, no exclamation stacks, no emojis, no "I hope this finds you well", no AI-chatbot phrasing.
- Never invent calendar times, pricing, or commercial terms.
- Close with ONE clear next step pointing to the booking link {{bookings_url}} (the prospect picks a 30-min slot with Shaun).
- Do NOT write a sign-off or signature — the signature is appended automatically. End the body on the call to action.${styleNotes}${examplesBlock}`;
    const user = `Prospect's reply:
Subject: ${msg.subject}
From: ${msg.from_email}
${(msg.body_text ?? "").substring(0, 3000)}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      }),
    });
    if (!aiRes.ok) throw new Error(`AI [${aiRes.status}]: ${await aiRes.text()}`);
    const json = await aiRes.json();
    const draft: string = (json.choices?.[0]?.message?.content ?? "").replace("{{bookings_url}}", settings?.bookings_url ?? "");

    const subject = msg.subject?.toLowerCase().startsWith("re:") ? msg.subject : `Re: ${msg.subject ?? ""}`;

    const { data: replyRow } = await supabase.from("outreach_replies").insert({
      enrollment_id: msg.enrollment_id,
      lead_id: msg.lead_id,
      inbound_message_id: msg.id,
      draft_body: draft,
      status: "draft",
      authored_by: "ai",
    }).select().single();

    if (auto_send) {
      const html = wrapHtml(draft, settings?.bookings_url, settings?.bookings_cta_label);
      const sendRes = await fetch(`${OUTLOOK_GATEWAY}/me/messages/${msg.graph_message_id}/reply`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": OUTLOOK_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: { body: { contentType: "HTML", content: html } } }),
      });
      if (!sendRes.ok && sendRes.status !== 202) {
        const t = await sendRes.text();
        throw new Error(`reply send [${sendRes.status}]: ${t}`);
      }
      await supabase.from("outreach_replies").update({ status: "sent", sent_body: draft, sent_at: new Date().toISOString() }).eq("id", replyRow!.id);
      if (msg.lead_id) {
        await supabase.from("candidate_notes").insert({
          lead_id: msg.lead_id,
          author_role: "ai",
          kind: "outbound",
          body: `Auto-replied to ${msg.from_email}.`,
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, reply_id: replyRow?.id, sent: !!auto_send }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("draft-reply error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
