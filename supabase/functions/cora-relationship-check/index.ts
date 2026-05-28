// On-demand relationship/duplicate check. Admin-only.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkRelationship } from "../_shared/relationshipCheck.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const { candidateId, email, company_name, website, phone, persist } = body ?? {};

    let input = { email, company_name, website, phone, excludeCandidateId: candidateId ?? null };
    if (candidateId) {
      const { data: cand } = await supabase
        .from("discovery_candidates")
        .select("email, company_name, website, phone")
        .eq("id", candidateId)
        .maybeSingle();
      if (cand) input = { ...input, ...cand, excludeCandidateId: candidateId };
    }

    const result = await checkRelationship(supabase, input);

    if (candidateId && persist !== false) {
      await supabase.from("discovery_candidates").update({
        existing_relationship_status: result.status,
        duplicate_check_status: result.status === "duplicate_company" || result.status === "duplicate_contact" ? result.status : null,
        duplicate_match_type: result.matched_record_type ?? null,
        matched_existing_record_id: result.matched_record_id ?? null,
        matched_existing_record_type: result.matched_record_type ?? null,
        contact_permission_status: result.contact_permission_status,
        contact_permission_reason: result.reason,
        do_not_contact_reason: result.contact_permission_status === "blocked" ? result.reason : null,
      }).eq("id", candidateId);

      await supabase.from("cora_decision_log").insert({
        candidate_id: candidateId,
        action: "relationship_check",
        reason: result.reason,
        relationship_check_result: result as any,
      });
    }

    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
