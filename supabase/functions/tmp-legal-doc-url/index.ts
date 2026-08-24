// TEMPORARY diagnostic function — returns a signed URL for a legal document file.
// Delete after the Rev 6 blank-line mapping work is complete.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

Deno.serve(async (req) => {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { path } = await req.json().catch(() => ({ path: null }));
  const { data, error } = await admin.storage
    .from("legal-documents")
    .createSignedUrl(String(path), 600);
  return new Response(JSON.stringify({ url: data?.signedUrl ?? null, error: error?.message }), {
    headers: { "Content-Type": "application/json" },
  });
});
