import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Preview resolver. Returns the live recipient set for an audience definition,
// with per-recipient flags (staff role, self-authored, provenance) so an admin
// can see exactly who is about to be mailed and why they qualified.
// Nothing is dropped silently except addresses on broadcast_excluded_addresses.

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    const caller = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: isAdmin, error: adminError } = await caller.rpc("is_current_user_admin");
    if (adminError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const audience = body?.audience ?? null;
    const campaignId = body?.campaign_id ?? null;

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let resolvedAudience = audience;
    if (!resolvedAudience && campaignId) {
      const { data: campaign } = await admin
        .from("broadcast_campaigns")
        .select("audience")
        .eq("id", campaignId)
        .maybeSingle();
      resolvedAudience = campaign?.audience ?? null;
    }

    if (!resolvedAudience?.type) {
      return new Response(JSON.stringify({ error: "An audience definition is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await admin.rpc("resolve_broadcast_audience", {
      p_audience: resolvedAudience,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipients = (data ?? []) as Array<Record<string, any>>;
    const summary = {
      total: recipients.length,
      excluded_by_default: recipients.filter((r) => r.excluded_by_default).length,
      staff: recipients.filter((r) => r.flags?.is_staff).length,
      self_authored: recipients.filter((r) => r.flags?.self_authored).length,
      from_json_snapshot: recipients.filter((r) => r.flags?.source === "json_snapshot").length,
    };

    return new Response(JSON.stringify({ audience: resolvedAudience, summary, recipients }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[resolve-broadcast-audience] error", error?.message);
    return new Response(JSON.stringify({ error: error?.message ?? "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
