// Bulk re-score pending discovery candidates (admin-invoked).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: candidates } = await admin.from("discovery_candidates").select("id, score").eq("status", "pending");
    let changed = 0;
    for (const c of candidates ?? []) {
      const { data: ns } = await admin.rpc("compute_candidate_score", { _candidate_id: c.id });
      if (typeof ns === "number" && ns !== c.score) {
        await admin.from("discovery_candidates").update({ score: ns }).eq("id", c.id);
        await admin.from("score_history").insert({ candidate_id: c.id, old_score: c.score, new_score: ns, reason: "manual", changed_by: user.id });
        changed++;
      }
    }

    // Auto-promote those crossing threshold if autopilot_discovery
    const { data: settings } = await admin.from("sales_agent_settings").select("autopilot_discovery, score_threshold").eq("id", true).maybeSingle();
    let promoted = 0;
    if (settings?.autopilot_discovery) {
      const { data: qualifying } = await admin.from("discovery_candidates")
        .select("id").eq("status", "pending").gte("score", settings.score_threshold ?? 60);
      for (const q of qualifying ?? []) {
        const { error } = await admin.rpc("promote_discovery_candidate", { _candidate_id: q.id });
        if (!error) promoted++;
      }
    }

    return new Response(JSON.stringify({ ok: true, total: candidates?.length ?? 0, changed, promoted }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("rescore error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
