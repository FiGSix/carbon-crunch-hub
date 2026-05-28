// Cora mailbox health check. Performs a real read-only probe against the
// Outlook Graph gateway (the generic verify_credentials endpoint returns a
// spurious "Invalid version: me" 404 for Outlook). Stores the latest result.
// Cron-driven; also callable on demand from the admin UI.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OUTLOOK_GATEWAY = "https://connector-gateway.lovable.dev/microsoft_outlook";

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
      // Lightweight read-only probe: fetch a single message id. This confirms
      // the connection is authorized AND the mailbox is reachable.
      const res = await fetch(
        `${OUTLOOK_GATEWAY}/me/messages?$top=1&$select=id,receivedDateTime`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": outlookKey,
          },
        },
      );
      latency_ms = Date.now() - t0;
      if (res.ok) {
        outcome = "verified";
        error = null;
      } else {
        outcome = "failed";
        const text = (await res.text().catch(() => "")).slice(0, 300);
        error = `Outlook probe [${res.status}]: ${text}`;
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
