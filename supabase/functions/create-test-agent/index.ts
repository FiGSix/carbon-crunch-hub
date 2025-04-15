
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the service role key
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the request body
    const { email, password, firstName, lastName, companyName } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({
          error: "Email and password are required"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if the user already exists
    const { data: existingUser, error: checkError } = await supabaseAdmin.auth.admin.getUserByEmail(email);
    
    if (checkError && checkError.message !== "User not found") {
      throw checkError;
    }

    // If user already exists, return error
    if (existingUser) {
      return new Response(
        JSON.stringify({
          error: "User with this email already exists",
          user: existingUser
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create the user with agent role
    const { data: userData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Automatically confirm the email
      user_metadata: {
        role: "agent",
        first_name: firstName || "Test",
        last_name: lastName || "Agent",
        company_name: companyName || "Test Company",
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
      },
    });

    if (createUserError) {
      throw createUserError;
    }

    // Make sure the profile record is created properly
    if (userData.user) {
      // Check if profile exists
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select()
        .eq("id", userData.user.id)
        .single();

      // If profile doesn't exist, create it manually
      if (!existingProfile) {
        await supabaseAdmin.from("profiles").insert({
          id: userData.user.id,
          email: email,
          role: "agent",
          first_name: firstName || "Test",
          last_name: lastName || "Agent",
          company_name: companyName || "Test Company",
          terms_accepted_at: new Date().toISOString(),
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: "Test agent account created successfully",
        user: userData.user
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating test agent:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred while creating the test agent"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
