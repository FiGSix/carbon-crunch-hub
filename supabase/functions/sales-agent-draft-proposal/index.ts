// Sales Agent — drafts the first proposal once a lead becomes a real opportunity.
// Idempotent: re-running for the same lead is a no-op if a proposal already exists.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SHAUN_ID = "6538aa1a-c0dc-4ce4-ab6f-bb4368d9fce1"; // Shaun Slabber (admin/agent)

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const { lead_id } = await req.json();
    if (!lead_id) throw new Error("lead_id required");

    const { data: lead, error: leadErr } = await supabase
      .from("agent_leads").select("*").eq("id", lead_id).single();
    if (leadErr || !lead) throw new Error("lead not found");

    // Idempotency: existing proposal for this lead
    const { data: existing } = await supabase
      .from("proposals").select("id, status").eq("lead_id", lead_id).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ ok: true, skipped: "already_drafted", proposal_id: existing.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find or create a client by email
    let clientId: string | null = null;
    if (lead.email) {
      const { data: existingClient } = await supabase
        .from("clients").select("id").eq("email", lead.email.toLowerCase()).maybeSingle();
      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const [first, ...rest] = (lead.contact_name || "").split(" ");
        const { data: newClient, error: cErr } = await supabase
          .from("clients").insert({
            email: lead.email.toLowerCase(),
            first_name: first || null,
            last_name: rest.join(" ") || null,
            company_name: lead.company_name || null,
            phone: lead.phone || null,
            notes: `Auto-created from Sales Agent lead ${lead.id}`,
            created_by: SHAUN_ID,
          }).select("id").single();
        if (cErr) throw new Error(`client create: ${cErr.message}`);
        clientId = newClient.id;
      }
    }

    const title = `Carbon-credit proposal — ${lead.company_name || lead.contact_name || "New opportunity"}`;
    const { data: proposal, error: pErr } = await supabase
      .from("proposals").insert({
        title,
        status: "draft",
        source: "sales_agent",
        lead_id: lead.id,
        client_reference_id: clientId,
        agent_id: SHAUN_ID,
        content: {
          generated_by: "sales_agent",
          lead_snapshot: {
            company: lead.company_name,
            contact: lead.contact_name,
            email: lead.email,
            phone: lead.phone,
            website: lead.website,
            location: lead.location,
            notes: lead.notes,
          },
        },
      }).select("id").single();
    if (pErr) throw new Error(`proposal insert: ${pErr.message}`);

    await supabase.from("candidate_notes").insert({
      lead_id: lead.id,
      author_role: "ai",
      kind: "system",
      body: `Drafted first proposal ${proposal.id} from this lead.`,
      meta: { proposal_id: proposal.id },
    });

    // Fire notification (best-effort)
    try {
      await supabase.functions.invoke("sales-agent-notify", {
        body: { trigger: "proposal_drafted", proposal_id: proposal.id, lead_id: lead.id },
      });
    } catch (e) { console.error("notify invoke", e); }

    return new Response(JSON.stringify({ ok: true, proposal_id: proposal.id, client_id: clientId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("draft-proposal error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
