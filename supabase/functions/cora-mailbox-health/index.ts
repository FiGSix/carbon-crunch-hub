// Cora mailbox health check. Polls the Outlook connector gateway's
// verify_credentials endpoint and stores the latest result. Cron-driven; also
// callable on demand from the admin UI.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const outlookKey = Deno.env.get("MICROSOFT_OUTLOOK_API_KEY");

  let outcome = "failed";
  let latency_ms: number | null = null;
  let error: string | null = null;

  if (!lovableKey) {
    error = "LOVABLE_API_KEY missing";
  } else if (!outlookKey) {
    error = "MICROSOFT_OUTLOOK_API_KEY missing — Outlook connector not linked";
  } else {
    try {
      const t0 = Date.now();
      const res = await fetch("https://connector-gateway.lovable.dev/api/v1/verify_credentials", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": outlookKey,
        },
      });
      latency_ms = Date.now() - t0;
      if (res.ok) {
        const j = await res.json();
        outcome = j.outcome === "verified" || j.outcome === "skipped" ? "verified" : (j.outcome ?? "failed");
        error = j.error ?? null;
      } else {
        outcome = "failed";
        error = `verify_credentials [${res.status}]: ${(await res.text().catch(() => "")).slice(0, 200)}`;
      }
    } catch (e) {
      outcome = "failed";
      error = e instanceof Error ? e.message : String(e);
    }
  }

  await supabase.from("cora_mailbox_status").upsert({
    id: true,
    mailbox_address: "cora@crunchcarbon.com",
    outcome,
    latency_ms,
    error,
    checked_at: new Date().toISOString(),
  });

  return new Response(JSON.stringify({ ok: true, outcome, latency_ms, error }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
