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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is admin via their JWT
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await userClient.rpc("is_current_user_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as CreateRequest;
    if (!body.email) {
      return new Response(JSON.stringify({ error: "Email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Create auth user (invitation-style: no password)
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(body.email, {
      data: {
        role: "super_partner",
        first_name: body.first_name || "",
        last_name: body.last_name || "",
        company_name: body.company_name || "",
      },
    });
    if (inviteErr || !invited?.user) {
      return new Response(JSON.stringify({ error: inviteErr?.message || "Invite failed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uid = invited.user.id;

    // Upsert profile with super_partner role
    await admin.from("profiles").upsert({
      id: uid,
      email: body.email,
      first_name: body.first_name || null,
      last_name: body.last_name || null,
      company_name: body.company_name || null,
      phone: body.phone || null,
      role: "super_partner",
      super_partner_status: "active",
      agent_status: "active",
      join_date: new Date().toISOString().slice(0, 10),
    }, { onConflict: "id" });

    // Insert user_roles row
    await admin.from("user_roles").upsert({
      user_id: uid,
      role: "super_partner" as any,
    }, { onConflict: "user_id,role" });

    return new Response(JSON.stringify({ id: uid, email: body.email }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
