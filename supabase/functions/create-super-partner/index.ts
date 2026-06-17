import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

const errMsg = (e: any): string => {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;
  const direct = e.message || e.error_description || e.msg || e.code;
  if (direct) return direct;
  // AuthRetryableFetchError and similar often serialize to "{}" via JSON.stringify
  const parts: string[] = [];
  if (e.name) parts.push(String(e.name));
  if (e.status) parts.push(`status ${e.status}`);
  if (e.code) parts.push(`code ${e.code}`);
  if (parts.length) return parts.join(" — ");
  try {
    const s = JSON.stringify(e);
    if (s && s !== "{}") return s;
  } catch { /* ignore */ }
  return e.toString?.() || "Unknown error";
};

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
      return json(401, { error: `Invalid authentication: ${errMsg(authError)}` });
    }
    const callerId = userData.user.id;

    // Admin check via profiles.role OR user_roles
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

    const userMeta = {
      role: "super_partner",
      first_name: body.first_name || "",
      last_name: body.last_name || "",
      company_name: body.company_name || "",
    };

    // 1) Find existing auth user by email (avoid inviteUserByEmail transport issue)
    let uid: string | null = null;
    try {
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (listErr) {
        console.error("listUsers failed:", listErr);
      } else {
        const found = list?.users?.find((u: any) => (u.email || "").toLowerCase() === email);
        if (found) uid = found.id;
      }
    } catch (e) {
      console.error("listUsers threw:", e);
    }

    // SAFETY: If a user already exists with this email, REFUSE to mutate them here.
    // This endpoint is for brand-new Super Partner accounts only. Promoting an
    // existing user must go through public.upgrade_agent_to_super_partner(uuid),
    // otherwise we silently overwrite the user's existing role (which is exactly
    // how 213 clients/agents were turned into super partners by mistake).
    if (uid) {
      const { data: existing } = await admin
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .maybeSingle();
      return json(409, {
        error: `A user with email ${email} already exists (role: ${existing?.role ?? "unknown"}). Use "Promote existing user" instead — this avoids overwriting their current role.`,
        existing_user_id: uid,
        existing_role: existing?.role ?? null,
      });
    }

    // 2) Create the brand-new auth user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: userMeta,
    });
    if (createErr || !created?.user) {
      console.error("createUser failed:", createErr);
      return json(400, { error: `Create user failed: ${errMsg(createErr)}` });
    }
    uid = created.user.id;


    // 3) Generate invite link (best-effort — depends on Auth SMTP config)
    try {
      const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
        type: "invite",
        email,
      });
      if (linkErr) {
        console.warn("generateLink (invite) failed (non-fatal):", linkErr);
      } else {
        console.log("Invite link generated for", email, "->", (link as any)?.properties?.action_link || "(hidden)");
      }
    } catch (e) {
      console.warn("generateLink threw (non-fatal):", e);
    }

    // 4) Upsert profile
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
      return json(500, { error: `Profile upsert failed: ${errMsg(profileErr)}` });
    }

    // 5) Upsert user_roles row
    const { error: roleErr } = await admin.from("user_roles").upsert({
      user_id: uid,
      role: "super_partner" as any,
    }, { onConflict: "user_id,role" });
    if (roleErr) {
      console.error("user_roles upsert failed:", roleErr);
      return json(500, { error: `Role assignment failed: ${errMsg(roleErr)}` });
    }

    return json(200, { id: uid, email });
  } catch (e: any) {
    console.error("create-super-partner unhandled:", e);
    return json(500, { error: errMsg(e) });
  }
});
