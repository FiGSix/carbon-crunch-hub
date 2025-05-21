
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    // Extract the token from the request body
    const { token } = await req.json();

    if (!token) {
      console.error("No token provided in request");
      return new Response(
        JSON.stringify({ error: "Token is required", code: "TOKEN_MISSING" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 400 }
      );
    }

    console.log(`Setting invitation token: ${token.substring(0, 8)}...`);

    // Create a Supabase client with the request's auth header
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader ?? '',
        },
      },
    });

    // Call the SQL function to set the token in the session with persistence flag set to true
    const { data, error } = await supabase.rpc(
      'set_request_invitation_token',
      { token }
    );

    if (error) {
      console.error("Error setting token:", error);
      return new Response(
        JSON.stringify({ 
          error: "Failed to set invitation token", 
          details: error.message,
          code: "TOKEN_SET_FAILED" 
        }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 }
      );
    }

    // Get the proposal details to verify the token was set correctly
    const { data: proposal, error: proposalError } = await supabase.rpc(
      'validate_invitation_token',
      { token }
    );

    // Return token validation information
    if (proposalError || !proposal || proposal.length === 0) {
      console.error("Token validation check failed:", proposalError || "No proposal found");
      return new Response(
        JSON.stringify({ 
          success: true,
          tokenSet: true,
          valid: false,
          error: proposalError?.message || "Invalid or expired token" 
        }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 200 }
      );
    }

    console.log("Token successfully set and validated");
    return new Response(
      JSON.stringify({ 
        success: true,
        tokenSet: true,
        valid: true,
        proposalId: proposal[0]?.proposal_id
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in set-invitation-token:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : String(error),
        code: "INTERNAL_ERROR"
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 }
    );
  }
});
