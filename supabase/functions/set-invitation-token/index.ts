
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0"

// Define CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface RequestBody {
  token: string;
}

interface ResponseBody {
  success: boolean;
  valid: boolean;
  proposalId?: string;
  clientEmail?: string; // Ensure this property is defined in the response interface
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { 
          headers: { Authorization: req.headers.get("Authorization") ?? "" } 
        }
      }
    )

    // Get token from request body
    const { token } = await req.json() as RequestBody;

    if (!token) {
      console.error("No token provided");
      return new Response(
        JSON.stringify({
          success: false,
          valid: false,
          error: "No token provided"
        } as ResponseBody),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400 
        }
      )
    }

    console.log(`Processing invitation token: ${token.substring(0, 8)}...`);

    // Set the token in the session using RPC
    const { data: tokenSet, error: tokenError } = await supabaseClient.rpc(
      'set_request_invitation_token',
      { token }
    )

    if (tokenError) {
      console.error("Error setting token:", tokenError);
      return new Response(
        JSON.stringify({
          success: false,
          valid: false,
          error: `Failed to set token: ${tokenError.message}`
        } as ResponseBody),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500 
        }
      )
    }

    // Validate the token to check if it corresponds to a valid proposal
    const { data: validationData, error: validationError } = await supabaseClient.rpc(
      'validate_invitation_token',
      { token }
    )

    if (validationError) {
      console.error("Token validation error:", validationError);
      return new Response(
        JSON.stringify({
          success: true,
          valid: false,
          error: "Invalid or expired invitation token"
        } as ResponseBody),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      )
    }

    // Check if validation returned a proposal ID
    const proposalId = validationData?.[0]?.proposal_id;
    const clientEmail = validationData?.[0]?.client_email;
    const valid = !!proposalId;

    if (!valid) {
      console.log("Token validation failed - no proposal found");
      return new Response(
        JSON.stringify({
          success: true,
          valid: false,
          error: "This invitation link is invalid or has expired"
        } as ResponseBody),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      )
    }

    console.log(`Token validation successful for proposal: ${proposalId}, client email: ${clientEmail}`);
    
    // Return success response with all needed data
    return new Response(
      JSON.stringify({
        success: true,
        valid: true,
        proposalId,
        clientEmail
      } as ResponseBody),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    )
  } catch (error) {
    console.error("Unexpected error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        valid: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      } as ResponseBody),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    )
  }
})
