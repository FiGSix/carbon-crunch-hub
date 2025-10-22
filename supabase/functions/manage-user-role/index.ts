import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface RoleManagementRequest {
  userId: string;
  action: "add" | "remove";
  role: "admin" | "agent" | "client";
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user is admin by querying user_roles table directly
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError) {
      console.error('Error fetching user roles:', roleError);
      return new Response(
        JSON.stringify({ error: "Failed to verify admin privileges" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isAdmin = userRoles?.some(r => r.role === 'admin');
    console.log('User role check:', { userId: user.id, userRoles, isAdmin });
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Admin privileges required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, action, role }: RoleManagementRequest = await req.json();
    console.log('Role management request:', { userId, action, role, requestedBy: user.id });

    // Validate input
    if (!userId || !action || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, action, role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["add", "remove"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Action must be 'add' or 'remove'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["admin", "agent", "client"].includes(role)) {
      return new Response(
        JSON.stringify({ error: "Role must be 'admin', 'agent', or 'client'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent self-demotion from admin role
    if (userId === user.id && action === "remove" && role === "admin") {
      return new Response(
        JSON.stringify({ error: "Cannot remove your own admin role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if target user exists
    const { data: targetUser, error: userError } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name")
      .eq("id", userId)
      .single();

    if (userError || !targetUser) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;

    if (action === "add") {
      // Add role
      const { data: insertData, error: insertError } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: role,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) {
        // Check if role already exists
        if (insertError.code === "23505") {
          return new Response(
            JSON.stringify({ error: "User already has this role" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw insertError;
      }

      result = insertData;
      console.log('Role added successfully:', { userId, role, result });

      // Log to audit table
      await supabase.from("user_role_audit").insert({
        user_id: userId,
        role: role,
        action: "added",
        performed_by: user.id,
      });

      // Update profiles table role field for backward compatibility
      await supabase
        .from("profiles")
        .update({ role: role })
        .eq("id", userId);

    } else {
      // Remove role
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);

      if (deleteError) {
        console.error('Error deleting role:', deleteError);
        throw deleteError;
      }
      console.log('Role removed successfully:', { userId, role });

      // Log to audit table
      await supabase.from("user_role_audit").insert({
        user_id: userId,
        role: role,
        action: "removed",
        performed_by: user.id,
      });

      // Get remaining roles and update profiles table
      const { data: remainingRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .order("role", { ascending: true })
        .limit(1);

      const newPrimaryRole = remainingRoles && remainingRoles.length > 0
        ? remainingRoles[0].role
        : "client"; // Default to client if no roles

      await supabase
        .from("profiles")
        .update({ role: newPrimaryRole })
        .eq("id", userId);

      result = { success: true };
    }

    console.log(`Role ${action} successful:`, { userId, role, performedBy: user.id });

    return new Response(
      JSON.stringify({
        success: true,
        action,
        role,
        user: targetUser,
        result,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in manage-user-role:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
