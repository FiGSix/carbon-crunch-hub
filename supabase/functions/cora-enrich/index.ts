// Cora continuous enrichment worker.
// Picks incomplete leads, fills missing fields via Firecrawl + Lovable AI,
// updates research_status, and self-re-invokes until the inbox is drained.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const BATCH_SIZE = 5;

function saLocation(loc?: string | null) {
  if (!loc) return null;
  const l = loc.toLowerCase();
  const regions = ["gauteng", "western cape", "eastern cape", "kwazulu", "mpumalanga", "limpopo", "north west", "free state", "northern cape"];
  const cities = ["johannesburg", "cape town", "durban", "pretoria", "port elizabeth", "bloemfontein", "stellenbosch"];
  if (l.includes("south africa") || l.endsWith(", za") || /\bza\b/.test(l) || regions.some(r => l.includes(r)) || cities.some(c => l.includes(c))) {
    const region = regions.find(r => l.includes(r));
    return { country: "ZA", region: region ?? null };
  }
  return null;
}

async function firecrawlScrape(url: string) {
  if (!FIRECRAWL_API_KEY) return null;
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.markdown as string) ?? data.data?.markdown ?? null;
  } catch (e) { console.error("firecrawl error", e); return null; }
}

async function llmExtract(companyName: string, websiteText: string | null, missing: string[]) {
  if (!LOVABLE_API_KEY) return null;
  const tools = [{
    type: "function",
    function: {
      name: "extract_lead_fields",
      description: "Extract missing CRM fields for a South African solar installer lead.",
      parameters: {
        type: "object",
        properties: {
          contact_name: { type: "string", description: "Primary contact full name, or empty string if unknown" },
          email: { type: "string", description: "Contact email (decision-maker, not info@ unless only option), or empty string" },
          website: { type: "string" },
          location: { type: "string", description: "City, province, country" },
          location_country: { type: "string", description: "ISO country code, ZA for South Africa" },
          location_region: { type: "string", description: "SA province if applicable" },
          segment: { type: "string", enum: ["residential", "commercial", "agri", "mixed", "unknown"] },
          fit_score: { type: "number", description: "0-5: how good a fit as a Crunch Carbon agent (SA solar installer)" },
          fit_reason: { type: "string" },
        },
        required: ["segment", "fit_score", "fit_reason"],
      },
    },
  }];
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You extract structured CRM fields for South African solar installers. Only return values you can verify from the provided text. Use empty strings for unknown text fields." },
          { role: "user", content: `Company: ${companyName}\nMissing fields: ${missing.join(", ")}\n\nWebsite content:\n${(websiteText ?? "").slice(0, 8000)}` },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "extract_lead_fields" } },
      }),
    });
    if (!res.ok) { console.error("ai error", res.status, await res.text().catch(() => "")); return null; }
    const data = await res.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    return args ? JSON.parse(args) : null;
  } catch (e) { console.error("ai exception", e); return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

  // Gating: settings
  const { data: settings } = await supabase.from("sales_agent_settings").select("*").eq("id", true).maybeSingle();
  if (settings?.emergency_stop || settings?.autopilot_enrichment === false || settings?.autopilot_status === "off") {
    return new Response(JSON.stringify({ ok: true, skipped: "disabled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Concurrency lock — skip if another enrich run is in flight (started < 10 min ago).
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: running } = await supabase.from("sales_agent_runs")
    .select("id").eq("job_name", "enrich").eq("status", "running").gte("started_at", tenMinAgo).limit(1);
  if (running && running.length > 0) {
    return new Response(JSON.stringify({ ok: true, skipped: "already_running" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Daily cap
  const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
  const { count: enrichedToday } = await supabase.from("cora_decision_log")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfDay.toISOString()).eq("action", "enrich_lead");
  const cap = settings?.enrichment_daily_cap ?? 500;
  if ((enrichedToday ?? 0) >= cap) {
    return new Response(JSON.stringify({ ok: true, skipped: "daily_cap" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { data: runRow } = await supabase.from("sales_agent_runs")
    .insert({ job_name: "enrich", status: "running", started_at: new Date().toISOString() })
    .select().single();
  const runId = runRow?.id;
  const stats: any = { processed: 0, completed: 0, still_incomplete: 0, errors: 0 };

  try {
    const completenessMin = settings?.completeness_threshold ?? 80;
    const { data: leads } = await supabase.from("discovery_candidates")
      .select("id, company_name, website, contact_name, email, location, location_country, segment, completeness_score, completeness_missing, fit_score, research_status")
      .or("research_status.is.null,research_status.in.(New,Researching,Incomplete)")
      .lt("completeness_score", completenessMin)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (!leads || leads.length === 0) {
      await supabase.from("sales_agent_runs").update({ status: "completed", completed_at: new Date().toISOString(), stats: { ...stats, idle: true } }).eq("id", runId);
      return new Response(JSON.stringify({ ok: true, idle: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    for (const lead of leads) {
      try {
        await supabase.from("discovery_candidates").update({ research_status: "Researching" }).eq("id", lead.id);

        const missing = (lead.completeness_missing as string[]) ?? [];
        let scraped: string | null = null;
        if (lead.website) scraped = await firecrawlScrape(lead.website);

        const extracted = await llmExtract(lead.company_name ?? "", scraped, missing);

        const patch: any = {};
        if (extracted) {
          if (!lead.contact_name && extracted.contact_name) patch.contact_name = extracted.contact_name;
          if (!lead.email && extracted.email && extracted.email.includes("@")) patch.email = extracted.email;
          if (!lead.location && extracted.location) patch.location = extracted.location;
          if (extracted.segment && extracted.segment !== "unknown") patch.segment = extracted.segment;
          if (typeof extracted.fit_score === "number") patch.fit_score = Math.round(extracted.fit_score);
          if (extracted.fit_reason) patch.fit_reason = extracted.fit_reason;
          const sa = saLocation(extracted.location ?? lead.location);
          if (sa) { patch.location_country = sa.country; if (sa.region) patch.location_region = sa.region; }
          else if (extracted.location_country) patch.location_country = extracted.location_country;
        }

        // Determine new status
        const updated = { ...lead, ...patch };
        const hasEmail = !!updated.email && String(updated.email).includes("@");
        const hasWebsite = !!updated.website;
        const isSA = (updated.location_country ?? "").toUpperCase() === "ZA";
        const hasSegment = updated.segment && updated.segment !== "unknown";
        const hasFit = (updated.fit_score ?? 0) >= 1;

        if (extracted && (extracted.fit_score ?? 0) === 0) {
          patch.research_status = "Not Fit";
        } else if (hasEmail && hasWebsite && isSA && hasSegment && hasFit) {
          patch.research_status = "Complete";
          stats.completed++;
        } else {
          patch.research_status = "Incomplete";
          stats.still_incomplete++;
        }
        patch.last_cora_decision_at = new Date().toISOString();

        await supabase.from("discovery_candidates").update(patch).eq("id", lead.id);
        await supabase.from("cora_decision_log").insert({
          candidate_id: lead.id,
          action: "enrich_lead",
          reason: `Enrichment pass — status: ${patch.research_status}`,
          data_used: { missing_before: missing, extracted, scraped_chars: scraped?.length ?? 0 },
        });
        stats.processed++;
      } catch (e) {
        console.error("enrich lead error", lead.id, e);
        stats.errors++;
      }
    }

    await supabase.from("sales_agent_runs").update({ status: "completed", completed_at: new Date().toISOString(), stats }).eq("id", runId);

    // Self re-invoke if we processed a full batch — keep draining.
    if (stats.processed >= BATCH_SIZE) {
      // Fire-and-forget; do not await
      supabase.functions.invoke("cora-enrich", { body: {} }).catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true, stats }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("cora-enrich error", e);
    await supabase.from("sales_agent_runs").update({ status: "failed", completed_at: new Date().toISOString(), stats, error: String(e) }).eq("id", runId);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
