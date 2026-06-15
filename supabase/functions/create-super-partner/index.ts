import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface CreateRequest {
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  phone?: string;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return json(500, { error: "Server misconfigured: service credentials missing" });
    }

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return json(401, { error: "Missing or malformed Authorization header" });
    }
    const token = authHeader.replace(/^[Bb]earer\s+/, "").trim();
    if (!token) return json(401, { error: "Empty bearer token" });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: authError } = await admin.auth.getUser(token);
    if (authError || !userData?.user) {
      console.error("JWT verification failed:", authError);
      return json(401, { error: `Invalid authentication: ${authError?.message || "no user"}` });
    }
    const callerId = userData.user.id;

    // Admin check via profiles.role AND/OR user_roles
    const [{ data: prof }, { data: roleRow }] = await Promise.all([
      admin.from("profiles").select("role").eq("id", callerId).maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle(),
    ]);
    const isAdmin = prof?.role === "admin" || !!roleRow;
    if (!isAdmin) {
      console.warn("Non-admin attempted create-super-partner", { callerId, role: prof?.role });
      return json(403, { error: "Admin privileges required" });
    }

    const body = (await req.json().catch(() => null)) as CreateRequest | null;
    if (!body) return json(400, { error: "Invalid JSON body" });

    const email = (body.email || "").trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return json(400, { error: "Valid email is required" });
    }

    // Invite (idempotent-ish: if user already exists, surface a clear error)
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        role: "super_partner",
        first_name: body.first_name || "",
        last_name: body.last_name || "",
        company_name: body.company_name || "",
      },
    });
    if (inviteErr || !invited?.user) {
      console.error("inviteUserByEmail failed:", inviteErr);
      return json(400, { error: inviteErr?.message || "Invite failed" });
    }

    const uid = invited.user.id;

    const { error: profileErr } = await admin.from("profiles").upsert({
      id: uid,
      email,
      first_name: body.first_name || null,
      last_name: body.last_name || null,
      company_name: body.company_name || null,
      phone: body.phone || null,
      role: "super_partner",
      super_partner_status: "active",
      agent_status: "active",
      join_date: new Date().toISOString().slice(0, 10),
    }, { onConflict: "id" });
    if (profileErr) {
      console.error("profiles upsert failed:", profileErr);
      return json(500, { error: `Profile upsert failed: ${profileErr.message}` });
    }

    const { error: roleErr } = await admin.from("user_roles").upsert({
      user_id: uid,
      role: "super_partner" as any,
    }, { onConflict: "user_id,role" });
    if (roleErr) {
      console.error("user_roles upsert failed:", roleErr);
      return json(500, { error: `Role assignment failed: ${roleErr.message}` });
    }

    return json(200, { id: uid, email });
  } catch (e: any) {
    console.error("create-super-partner unhandled:", e);
    return json(500, { error: e?.message || "Server error" });
  }
});
