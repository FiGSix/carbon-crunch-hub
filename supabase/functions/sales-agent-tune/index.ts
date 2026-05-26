// Auto-tune: prune losing variants once each has enough data.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MIN_SAMPLE = 30;

// Wilson lower bound on positive_reply_rate
function wilsonLower(pos: number, n: number): number {
  if (n === 0) return 0;
  const z = 1.96;
  const p = pos / n;
  const denom = 1 + (z * z) / n;
  const center = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
  return (center - margin) / denom;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: runRow } = await supabase.from("sales_agent_runs").insert({ job_name: "tune", status: "running", started_at: new Date().toISOString() }).select().single();
  const runId = runRow?.id;
  const decisions: any[] = [];

  try {
    const { data: stats } = await supabase.from("v_outreach_variant_stats").select("*").eq("status", "active");
    // Group by sequence_id + step_index
    const groups = new Map<string, any[]>();
    (stats ?? []).forEach((r: any) => {
      const k = `${r.sequence_id}::${r.step_index}`;
      groups.set(k, [...(groups.get(k) ?? []), r]);
    });

    for (const [key, rows] of groups.entries()) {
      const eligible = rows.filter((r) => r.sent >= MIN_SAMPLE);
      if (eligible.length < 2) continue;

      const withBounds = eligible.map((r) => ({ ...r, lower: wilsonLower(r.positive_replies ?? 0, r.sent ?? 0) }));
      withBounds.sort((a, b) => b.lower - a.lower);
      const leader = withBounds[0];
      // Retire variants whose UPPER bound is below the leader's LOWER bound (clearly worse)
      for (const r of withBounds.slice(1)) {
        const upper = (r.positive_replies + 1.96 * Math.sqrt(((r.positive_replies / r.sent) * (1 - r.positive_replies / r.sent)) / r.sent)) / r.sent;
        if (upper < leader.lower) {
          await supabase.from("outreach_template_variants").update({ status: "retired" }).eq("id", r.variant_id);
          decisions.push({ key, retired: r.variant_id, subject: r.subject, leader: leader.variant_id });
        }
      }
      // Bump leader weight (cap at 4)
      const newW = Math.min(4, 1 + decisions.filter((d) => d.leader === leader.variant_id).length * 0.5);
      await supabase.from("outreach_template_variants").update({ weight: newW }).eq("id", leader.variant_id);
    }

    await supabase.from("sales_agent_runs").update({ status: "completed", completed_at: new Date().toISOString(), stats: { decisions } }).eq("id", runId);
    return new Response(JSON.stringify({ ok: true, decisions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    await supabase.from("sales_agent_runs").update({ status: "failed", completed_at: new Date().toISOString(), error: String(e) }).eq("id", runId);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
