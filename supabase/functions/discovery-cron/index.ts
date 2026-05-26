// Sales Agent — daily discovery wrapper.
// Iterates active discovery presets, invokes `discover-leads` for each,
// then auto-promotes pending candidates whose score >= settings.score_threshold.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: runRow } = await supabase.from("sales_agent_runs")
    .insert({ job_name: "discovery", status: "running", started_at: new Date().toISOString() })
    .select().single();
  const runId = runRow?.id;
  const stats: any = { presets_run: 0, presets_failed: 0, promoted: 0, promotion_failed: 0 };

  try {
    const { data: settings } = await supabase.from("sales_agent_settings").select("*").eq("id", true).maybeSingle();
    if (settings && settings.autopilot_discovery === false) {
      await supabase.from("sales_agent_runs").update({ status: "completed", completed_at: new Date().toISOString(), stats: { ...stats, skipped: "autopilot_off" } }).eq("id", runId);
      return new Response(JSON.stringify({ ok: true, skipped: "autopilot_off" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const threshold = settings?.score_threshold ?? 70;

    const { data: presets } = await supabase
      .from("sales_agent_discovery_presets").select("*").eq("active", true);

    for (const p of presets ?? []) {
      try {
        const { error } = await supabase.functions.invoke("discover-leads", {
          body: { query: p.query, location: p.location, limit: p.limit_count ?? 10 },
        });
        if (error) throw error;
        stats.presets_run++;
        await supabase.from("sales_agent_discovery_presets")
          .update({ last_run_at: new Date().toISOString() }).eq("id", p.id);
      } catch (e) {
        console.error(`preset ${p.id} failed`, e);
        stats.presets_failed++;
      }
    }

    // Auto-promote pending candidates above threshold
    const { data: pending } = await supabase
      .from("discovery_candidates").select("id, score")
      .eq("status", "pending").gte("score", threshold).limit(200);

    for (const c of pending ?? []) {
      const { error: pErr } = await supabase.rpc("promote_discovery_candidate", { _candidate_id: c.id });
      if (pErr) { stats.promotion_failed++; console.error("promote", c.id, pErr); }
      else stats.promoted++;
    }

    await supabase.from("sales_agent_runs").update({ status: "completed", completed_at: new Date().toISOString(), stats }).eq("id", runId);
    return new Response(JSON.stringify({ ok: true, stats }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("discovery-cron error", e);
    await supabase.from("sales_agent_runs").update({ status: "failed", completed_at: new Date().toISOString(), stats, error_message: String(e) }).eq("id", runId);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
