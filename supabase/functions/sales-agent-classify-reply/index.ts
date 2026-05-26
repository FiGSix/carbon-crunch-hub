// Classify a single inbound message using Lovable AI Gateway.
// Updates inbound_messages.intent/confidence and may trigger draft reply.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const INTENTS = ["interested", "not_interested", "question", "bounce", "ooo", "unsubscribe", "other"] as const;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const { inbound_message_id } = await req.json();
    if (!inbound_message_id) throw new Error("inbound_message_id required");

    const { data: msg, error } = await supabase.from("inbound_messages").select("*").eq("id", inbound_message_id).single();
    if (error || !msg) throw new Error("inbound message not found");

    const prompt = `Classify the intent of this sales reply. Return JSON: {"intent":"<one of: ${INTENTS.join("|")}>","confidence":0-100,"reason":"short"}.
Subject: ${msg.subject ?? ""}
From: ${msg.from_email}
Body:
${(msg.body_text ?? "").substring(0, 4000)}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You classify sales email replies. Respond with strict JSON only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`AI gateway [${aiRes.status}]: ${t}`);
    }
    const aiJson = await aiRes.json();
    const content: string = aiJson.choices?.[0]?.message?.content ?? "{}";
    const jsonText = content.replace(/```json|```/g, "").trim();
    let parsed: any = {};
    try { parsed = JSON.parse(jsonText); } catch { parsed = { intent: "other", confidence: 0 }; }
    const intent = INTENTS.includes(parsed.intent) ? parsed.intent : "other";
    const confidence = Math.max(0, Math.min(100, Number(parsed.confidence) || 0));

    await supabase.from("inbound_messages").update({
      intent, confidence, processed_at: new Date().toISOString(),
    }).eq("id", msg.id);

    // Side-effects on lead/enrollment
    if (msg.lead_id) {
      if (intent === "unsubscribe") {
        await supabase.from("client_email_suppressions").insert({ email: msg.from_email, reason: "unsubscribe", source: "inbound_reply" }).select();
      }
      if (intent === "bounce") {
        await supabase.from("agent_leads").update({ status: "bounced" }).eq("id", msg.lead_id);
      } else if (intent === "interested" || intent === "question") {
        await supabase.from("agent_leads").update({ status: "replied" }).eq("id", msg.lead_id);
      } else if (intent === "not_interested") {
        await supabase.from("agent_leads").update({ status: "rejected" }).eq("id", msg.lead_id);
      }
      if (msg.enrollment_id && intent !== "ooo") {
        await supabase.from("outreach_enrollments").update({ status: "stopped", paused_reason: `reply: ${intent}`, completed_at: new Date().toISOString() }).eq("id", msg.enrollment_id);
      }
      await supabase.from("candidate_notes").insert({
        lead_id: msg.lead_id,
        author_role: "ai",
        kind: "inbound",
        body: `Reply from ${msg.from_email} classified as ${intent} (${confidence}%).${parsed.reason ? " " + parsed.reason : ""}`,
      });
    }

    // Autopilot draft
    const { data: settings } = await supabase.from("sales_agent_settings").select("autopilot_replies, reply_confidence_threshold, autopilot_reply_min_confidence").eq("id", true).maybeSingle();
    if ((intent === "interested" || intent === "question") && msg.lead_id) {
      const minConf = Math.max(settings?.reply_confidence_threshold ?? 80, settings?.autopilot_reply_min_confidence ?? 90);
      try {
        await supabase.functions.invoke("sales-agent-draft-reply", { body: { inbound_message_id: msg.id, auto_send: !!settings?.autopilot_replies && confidence >= minConf } });
      } catch (e) { console.error("draft invoke", e); }
    }

    // NOTE: Auto-drafting proposals from leads has been removed.
    // The Sales Agent's job ends at qualifying the lead and (optionally) sending an
    // Agent invitation. Proposals are created by onboarded Agents for their own clients,
    // who hold the project-level data (system size, address, commission date).

    return new Response(JSON.stringify({ ok: true, intent, confidence }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("classify-reply error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
