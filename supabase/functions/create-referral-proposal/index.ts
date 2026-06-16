import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const Body = z.object({
  token: z.string().min(8).max(64),
  client: z.object({
    name: z.string().trim().min(1).max(200),
    email: z.string().trim().email().max(255),
    phone: z.string().trim().max(40).optional().nullable(),
  }),
  system: z.object({
    size_kwp: z.number().positive().max(1_000_000),
    property_type: z.string().min(1).max(60),
    province: z.string().min(1).max(80),
    has_existing: z.boolean(),
  }),
});

// Mirror src/lib/calculations/carbon constants
const DEFAULT_ANNUAL_GENERATION_FACTOR = 1642.5;
const DEFAULT_CARBON_FACTOR = 1.0334;

function calcClientShare(portfolioKWp: number): number {
  if (portfolioKWp < 5000) return 60.2;
  if (portfolioKWp < 10000) return 63;
  if (portfolioKWp < 20000) return 66.5;
  if (portfolioKWp < 30000) return 68.25;
  return 70;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { token, client, system } = parsed.data;
    const normalizedEmail = client.email.toLowerCase().trim();

    // 1. Validate token
    const { data: link, error: linkErr } = await admin
      .from("referral_links")
      .select("id, owner_id, token, link_type, is_active")
      .eq("token", token)
      .eq("is_active", true)
      .maybeSingle();
    if (linkErr || !link) {
      return new Response(
        JSON.stringify({ success: false, error: "Referral link is invalid or no longer active." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Rate limit: 3 / 24h per email
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existing, count } = await admin
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .ilike("client_email", normalizedEmail)
      .gte("created_at", since);
    void existing;
    if ((count ?? 0) >= 3) {
      return new Response(
        JSON.stringify({ success: false, error: "Too many proposals for this email in the last 24 hours." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Find or create client
    const [firstName, ...rest] = client.name.trim().split(/\s+/);
    const lastName = rest.join(" ") || null;
    const { data: clientId, error: clientErr } = await admin.rpc("find_or_create_client_by_email", {
      p_email: normalizedEmail,
      p_first_name: firstName,
      p_last_name: lastName,
      p_phone: client.phone || null,
      p_company_name: null,
      p_created_by: link.owner_id,
    });
    if (clientErr || !clientId) {
      console.error("client RPC failed", clientErr);
      return new Response(
        JSON.stringify({ success: false, error: "Could not create client record." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4. Resolve agent company
    const { data: companyId, error: companyErr } = await admin.rpc("ensure_agent_has_company", {
      p_agent_id: link.owner_id,
    });
    if (companyErr) {
      console.error("ensure_agent_has_company failed", companyErr);
    }

    // 5. Compute commission / projections
    // Portfolio = sum of signed system_size_kwp for this company
    let portfolioKWp = 0;
    if (companyId) {
      const { data: portfolio } = await admin
        .from("proposals")
        .select("system_size_kwp")
        .eq("company_id", companyId)
        .not("signed_at", "is", null)
        .is("deleted_at", null);
      portfolioKWp = (portfolio ?? []).reduce(
        (s: number, r: { system_size_kwp: number | null }) => s + (r.system_size_kwp ?? 0),
        0,
      );
    }
    const clientShare = calcClientShare(portfolioKWp);

    // Company override or MWp-tier
    let agentCommission = portfolioKWp < 15000 ? 4 : 7;
    if (companyId) {
      const { data: co } = await admin
        .from("companies")
        .select("commission_override")
        .eq("id", companyId)
        .maybeSingle();
      if (co?.commission_override !== null && co?.commission_override !== undefined) {
        agentCommission = Number(co.commission_override);
      }
    }

    const annualEnergy = system.size_kwp * DEFAULT_ANNUAL_GENERATION_FACTOR;
    const carbonCredits = (annualEnergy / 1000) * DEFAULT_CARBON_FACTOR;

    // 6. Insert proposal
    const proposalContent = {
      referral_created: true,
      referral_link_id: link.id,
      client: {
        name: client.name,
        email: normalizedEmail,
        phone: client.phone || null,
      },
      system: {
        size_kwp: system.size_kwp,
        property_type: system.property_type,
        province: system.province,
        has_existing: system.has_existing,
      },
      projections: {
        annual_energy_kwh: annualEnergy,
        carbon_credits_tco2_per_year: carbonCredits,
      },
    };

    const { data: proposal, error: proposalErr } = await admin
      .from("proposals")
      .insert({
        agent_id: link.owner_id,
        company_id: companyId ?? null,
        client_reference_id: clientId,
        client_name: client.name,
        client_email: normalizedEmail,
        client_phone: client.phone || null,
        system_size_kwp: system.size_kwp,
        status: "sent",
        client_share_percentage: clientShare,
        agent_commission_percentage: agentCommission,
        content: proposalContent,
      })
      .select("id")
      .single();

    if (proposalErr || !proposal) {
      console.error("proposal insert failed", proposalErr);
      return new Response(
        JSON.stringify({ success: false, error: "Could not create proposal." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 7. Update counters + events
    await admin
      .from("referral_links")
      .update({
        signups: (await admin.from("referral_links").select("signups").eq("id", link.id).maybeSingle()).data?.signups != null
          ? undefined
          : undefined,
      })
      .eq("id", link.id);
    // Atomic increment via RPC pattern: use raw update with expression isn't supported via PostgREST,
    // so issue two row updates using existing values
    {
      const { data: cur } = await admin
        .from("referral_links")
        .select("signups, conversions")
        .eq("id", link.id)
        .maybeSingle();
      if (cur) {
        await admin
          .from("referral_links")
          .update({
            signups: (cur.signups ?? 0) + 1,
            conversions: (cur.conversions ?? 0) + 1,
          })
          .eq("id", link.id);
      }
    }
    await admin.from("referral_events").insert([
      { referral_link_id: link.id, event_type: "signup" },
      { referral_link_id: link.id, event_type: "conversion" },
    ]);

    // 8. Send proposal email to client (CC partner)
    if (RESEND_API_KEY) {
      const { data: partnerProfile } = await admin
        .from("profiles")
        .select("first_name, last_name, email, company_name")
        .eq("id", link.owner_id)
        .maybeSingle();

      const origin = req.headers.get("origin") || "https://crunchcarbon.com";
      const signingLink = `${origin}/view-proposal/${proposal.id}`;
      const partnerName = [partnerProfile?.first_name, partnerProfile?.last_name].filter(Boolean).join(" ") || "Crunch Carbon";

      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
          <h1 style="margin:0 0 16px;font-size:24px">Hi ${(firstName || client.name).replace(/[<>]/g, "")},</h1>
          <p>Your free Crunch Carbon proposal is ready. ${partnerName} put this together for you and a copy has been sent to them too.</p>
          <ul style="line-height:1.7">
            <li><strong>System size:</strong> ${system.size_kwp} kWp</li>
            <li><strong>Estimated carbon credits:</strong> ${carbonCredits.toFixed(2)} tCO₂ / year</li>
            <li><strong>Estimated clean energy:</strong> ${(annualEnergy / 1000).toFixed(2)} MWh / year</li>
          </ul>
          <p style="margin:24px 0">
            <a href="${signingLink}" style="background:#16a34a;color:#fff;padding:14px 22px;border-radius:10px;text-decoration:none;display:inline-block;font-weight:600">
              View &amp; sign your proposal
            </a>
          </p>
          <p style="font-size:13px;color:#64748b">This is a conservative estimate. Your actual earnings depend on your real energy meter data — the final figure could be higher or lower.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
          <p style="font-size:12px;color:#94a3b8">Crunch Carbon — turning your solar into income.</p>
        </div>
      `;

      try {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Crunch Carbon <proposals@crunchcarbon.com>",
            to: [normalizedEmail],
            cc: partnerProfile?.email ? [partnerProfile.email] : undefined,
            subject: `Your Crunch Carbon proposal — ${carbonCredits.toFixed(2)} tCO₂ / year`,
            html,
          }),
        });
        if (!r.ok) console.error("resend send failed", r.status, await r.text());
      } catch (e) {
        console.error("resend error", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        proposal_id: proposal.id,
        annual_energy: annualEnergy,
        carbon_credits: carbonCredits,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("create-referral-proposal error", e);
    return new Response(
      JSON.stringify({ success: false, error: "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
