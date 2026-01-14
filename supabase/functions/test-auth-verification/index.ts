import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - no auth header" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid token" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin access required" }), 
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, email } = await req.json();
    console.log(`🔧 Auth test action: ${action} for email: ${email}`);

    switch (action) {
      case "check_status": {
        // Check user's verification status
        const { data: userData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) {
          console.error("Error listing users:", listError);
          throw listError;
        }

        const targetUser = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        
        console.log(`📧 User lookup for ${email}:`, targetUser ? "Found" : "Not found");
        
        return new Response(JSON.stringify({
          success: true,
          found: !!targetUser,
          email,
          emailConfirmed: !!targetUser?.email_confirmed_at,
          confirmedAt: targetUser?.email_confirmed_at,
          createdAt: targetUser?.created_at,
          lastSignIn: targetUser?.last_sign_in_at,
          userId: targetUser?.id
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "verify_user": {
        // Directly confirm user's email
        const { data: userData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) throw listError;
        
        const targetUser = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        
        if (!targetUser) {
          return new Response(JSON.stringify({
            success: false,
            error: `User not found: ${email}`
          }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (targetUser.email_confirmed_at) {
          return new Response(JSON.stringify({
            success: true,
            message: `Email already confirmed for ${email}`,
            confirmedAt: targetUser.email_confirmed_at
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
          email_confirm: true
        });
        
        if (updateError) {
          console.error("Error confirming user:", updateError);
          throw updateError;
        }
        
        console.log(`✅ Email confirmed for ${email}`);
        
        return new Response(JSON.stringify({
          success: true,
          message: `Email confirmed for ${email}`,
          userId: targetUser.id
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "generate_link": {
        // Generate a magic link for testing the callback flow
        const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: email,
          options: {
            redirectTo: `${req.headers.get("origin") || "https://crunch-carbon-hub.lovable.app"}/auth/callback`
          }
        });
        
        if (linkError) {
          console.error("Error generating link:", linkError);
          throw linkError;
        }
        
        // Build test URL with token_hash
        const baseUrl = req.headers.get("origin") || "https://crunch-carbon-hub.lovable.app";
        const testUrl = `${baseUrl}/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink`;
        
        console.log(`🔗 Generated test link for ${email}`);
        
        return new Response(JSON.stringify({
          success: true,
          testUrl,
          hashedToken: data.properties.hashed_token,
          note: "Click this URL to test the AuthCallback flow"
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "resend_confirmation": {
        // Resend confirmation email using Supabase's built-in method
        const { error: resendError } = await supabaseAdmin.auth.resend({
          type: "signup",
          email: email,
          options: {
            emailRedirectTo: `${req.headers.get("origin") || "https://crunch-carbon-hub.lovable.app"}/auth/callback`
          }
        });
        
        if (resendError) {
          console.error("Error resending confirmation:", resendError);
          throw resendError;
        }
        
        console.log(`📧 Resent confirmation email to ${email}`);
        
        return new Response(JSON.stringify({
          success: true,
          message: `Confirmation email resent to ${email}`
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({
          error: `Invalid action: ${action}`,
          validActions: ["check_status", "verify_user", "generate_link", "resend_confirmation"]
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (error) {
    console.error("❌ Error in test-auth-verification:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
