// TEMPORARY verification helper — used only for the Cession Agreement
// end-to-end evidence run. Gated by a one-off shared key and deleted
// immediately after the verification completes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-e2e-key",
};

const E2E_KEY = "e2e-cession-verify-2026-08-24-9f3ac1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.headers.get("x-e2e-key") !== E2E_KEY) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { bucket, path, op } = await req.json().catch(() => ({}));
  if (!bucket || !path) {
    return new Response(JSON.stringify({ error: "bucket and path are required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (op === "delete") {
    const { error } = await admin.storage.from(bucket).remove([path]);
    return new Response(JSON.stringify({ deleted: !error, error: error?.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 900);
  return new Response(
    JSON.stringify(error ? { error: error.message } : { url: data?.signedUrl }),
    {
      status: error ? 404 : 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
