// Cora preset auto-expansion. Marks low-yield presets stale, then asks the
// LLM for fresh preset variations targeting the SA solar installer goal.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const MAX_ACTIVE_PRESETS = 20;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: settings } = await supabase.from("sales_agent_settings").select("*").eq("id", true).maybeSingle();
  if (settings?.emergency_stop || settings?.autopilot_preset_expand === false) {
    return new Response(JSON.stringify({ ok: true, skipped: "disabled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const stats: any = { marked_stale: 0, generated: 0, inserted: 0 };
  const { data: runRow } = await supabase.from("sales_agent_runs")
    .insert({ job_name: "preset_expand", status: "running", started_at: new Date().toISOString() })
    .select().single();
  const runId = runRow?.id;

  try {
    const { data: presets } = await supabase.from("sales_agent_discovery_presets").select("*").eq("active", true);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const queries = (presets ?? []).map((p: any) => p.query);

    for (const p of presets ?? []) {
      const { count } = await supabase.from("discovery_candidates")
        .select("id", { count: "exact", head: true })
        .gte("created_at", fourteenDaysAgo)
        .eq("run_id", p.id); // best-effort; falls back to 0 if no link
      const yieldCount = count ?? 0;
      const isStale = yieldCount < 3;
      await supabase.from("sales_agent_discovery_presets")
        .update({ last_yield_count: yieldCount, stale: isStale })
        .eq("id", p.id);
      if (isStale) stats.marked_stale++;
    }

    // Onboarded companies (for diversity)
    const { data: onboarded } = await supabase.from("discovery_candidates")
      .select("company_name, location_region").eq("sales_status", "Signed Up").limit(100);

    // Generate new presets if we are below cap
    const activeCount = (presets ?? []).filter((p: any) => p.active).length;
    const room = Math.max(0, MAX_ACTIVE_PRESETS - activeCount);
    if (room > 0 && LOVABLE_API_KEY) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You generate web-search discovery queries for finding South African solar installer companies (residential, commercial, agri). Goal: build a pipeline of 250 onboarded agents for Crunch Carbon. Propose queries different from existing ones, varying SA region, segment, and search angle." },
            { role: "user", content: `Existing queries:\n${queries.join("\n")}\n\nAlready onboarded (avoid these regions/companies dominating):\n${(onboarded ?? []).map((o: any) => `${o.company_name} (${o.location_region ?? "?"})`).join("\n")}\n\nPropose ${Math.min(3, room)} new presets.` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "propose_presets",
              parameters: {
                type: "object",
                properties: {
                  presets: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        query: { type: "string" },
                        location: { type: "string" },
                        limit_count: { type: "number" },
                        rationale: { type: "string" },
                      },
                      required: ["query", "location", "limit_count"],
                    },
                  },
                },
                required: ["presets"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "propose_presets" } },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        const parsed = args ? JSON.parse(args) : null;
        const newPresets = (parsed?.presets ?? []).slice(0, room);
        stats.generated = newPresets.length;
        for (const np of newPresets) {
          const { error } = await supabase.from("sales_agent_discovery_presets").insert({
            query: np.query, location: np.location, limit_count: np.limit_count ?? 10,
            active: true, source: "auto_expand",
          });
          if (!error) stats.inserted++;
        }
        await supabase.from("cora_decision_log").insert({
          action: "preset_auto_expand",
          reason: `Generated ${stats.inserted} new presets`,
          data_used: { presets: newPresets },
        });
      }
    }

    // Retire excess: deactivate oldest auto_expand presets with 0 yield
    const total = (presets ?? []).length + stats.inserted;
    if (total > MAX_ACTIVE_PRESETS) {
      const excess = total - MAX_ACTIVE_PRESETS;
      const { data: retire } = await supabase.from("sales_agent_discovery_presets")
        .select("id").eq("active", true).eq("source", "auto_expand").eq("last_yield_count", 0)
        .order("created_at", { ascending: true }).limit(excess);
      for (const r of retire ?? []) {
        await supabase.from("sales_agent_discovery_presets").update({ active: false }).eq("id", r.id);
      }
    }

    await supabase.from("sales_agent_runs").update({ status: "completed", completed_at: new Date().toISOString(), stats }).eq("id", runId);
    return new Response(JSON.stringify({ ok: true, stats }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("preset-expand error", e);
    await supabase.from("sales_agent_runs").update({ status: "failed", completed_at: new Date().toISOString(), stats, error: String(e) }).eq("id", runId);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
