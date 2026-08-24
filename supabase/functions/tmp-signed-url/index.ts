// TEMPORARY verification helper — returns a signed URL for a proposal-pdfs object.
// Delete after verification.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

Deno.serve(async (req) => {
  const { path, bucket = "proposal-pdfs" } = await req.json().catch(() => ({}));
  if (!path) return new Response(JSON.stringify({ error: "path required" }), { status: 400 });
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 600);
  return new Response(JSON.stringify({ url: data?.signedUrl, error: error?.message }), {
    headers: { "Content-Type": "application/json" },
  });
});
