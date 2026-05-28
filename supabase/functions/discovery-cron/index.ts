// Sales Agent — discovery wrapper with goal-driven top-up.
// 1) Runs active discovery presets.
// 2) Auto-promotes high-score candidates.
// 3) If onboarded < target_agents, re-runs presets up to max_topup_runs_per_day.
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
  const stats: any = { presets_run: 0, presets_failed: 0, promoted: 0, promotion_failed: 0, topup: false, topup_presets_run: 0 };

  try {
    const { data: settings } = await supabase.from("sales_agent_settings").select("*").eq("id", true).maybeSingle();
    if (settings && settings.autopilot_discovery === false) {
      await supabase.from("sales_agent_runs").update({ status: "completed", completed_at: new Date().toISOString(), stats: { ...stats, skipped: "autopilot_off" } }).eq("id", runId);
      return new Response(JSON.stringify({ ok: true, skipped: "autopilot_off" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const threshold = settings?.score_threshold ?? 70;

    const { data: presets } = await supabase
      .from("sales_agent_discovery_presets").select("*").eq("active", true);

    const runPreset = async (p: any) => {
      const { error } = await supabase.functions.invoke("discover-leads", {
        body: { query: p.query, location: p.location, limit: p.limit_count ?? 10 },
      });
      if (error) throw error;
      await supabase.from("sales_agent_discovery_presets")
        .update({ last_run_at: new Date().toISOString() }).eq("id", p.id);
    };

    for (const p of presets ?? []) {
      try { await runPreset(p); stats.presets_run++; }
      catch (e) { console.error(`preset ${p.id} failed`, e); stats.presets_failed++; }
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

    // ---- Goal-driven top-up ----
    if (settings?.goal_topup_enabled !== false) {
      const target = settings?.target_agents ?? 250;
      const expectedConv = Number(settings?.expected_conversion ?? 0.1);
      const maxTopups = settings?.max_topup_runs_per_day ?? 4;

      const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
      const { count: onboarded } = await supabase.from("discovery_candidates")
        .select("id", { count: "exact", head: true }).eq("sales_status", "Signed Up");
      const { count: pipeline } = await supabase.from("discovery_candidates")
        .select("id", { count: "exact", head: true })
        .or("research_status.eq.Complete,outreach_status.not.is.null")
        .is("sales_status", null);
      const { count: topupsToday } = await supabase.from("sales_agent_runs")
        .select("id", { count: "exact", head: true })
        .eq("job_name", "discovery_topup")
        .gte("started_at", startOfDay.toISOString());

      const projected = (onboarded ?? 0) + Math.round((pipeline ?? 0) * expectedConv);
      const gap = target - projected;

      if (gap > 0 && (topupsToday ?? 0) < maxTopups && (presets ?? []).length > 0) {
        stats.topup = true;
        const { data: topupRunRow } = await supabase.from("sales_agent_runs")
          .insert({ job_name: "discovery_topup", status: "running", started_at: new Date().toISOString(), stats: { gap, onboarded, pipeline } })
          .select().single();
        // Re-run all active presets (highest-yield first)
        const sorted = [...(presets ?? [])].sort((a: any, b: any) => (b.last_yield_count ?? 0) - (a.last_yield_count ?? 0));
        for (const p of sorted) {
          try { await runPreset(p); stats.topup_presets_run++; } catch (e) { console.error("topup preset failed", e); }
        }
        await supabase.from("sales_agent_runs").update({ status: "completed", completed_at: new Date().toISOString(), stats: { presets_run: stats.topup_presets_run, gap } }).eq("id", topupRunRow?.id);
      }
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
