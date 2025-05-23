
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders, ErrorResponse } from "../_shared/types.ts";
import { verifyUserAuth, createResponse } from "./auth.ts";
import { processClientRequest } from "./client/client-processor.ts";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Configuration
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return createResponse({
        error: "Server configuration error. Missing required environment variables.",
      }, 500);
    }

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    
    // Verify auth and get user details
    const authResult = await verifyUserAuth(authHeader, supabaseUrl, supabaseServiceKey);
    
    if ('error' in authResult) {
      return createResponse(authResult, authResult.status);
    }
    
    // User is authenticated, proceed with client management
    const { userId, role } = authResult;
    
    // Parse request body
    const requestBody = await req.json();
    const { name, email, phone, companyName, existingClient } = requestBody;
    
    if (!email) {
      return createResponse({
        error: "Email is required"
      }, 400);
    }

    // Connect to Supabase with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Process the client request using the processClientRequest function
    const result = await processClientRequest(
      {
        email: email.toLowerCase().trim(),
        firstName: name?.split(' ')[0] || "",
        lastName: name?.split(' ').slice(1).join(' ') || "",
        phone: phone || null,
        companyName: companyName || null,
        existingClient: existingClient || false
      },
      userId,
      supabase
    );
    
    // Check if there was an error in processing
    if ('error' in result) {
      return createResponse(result, result.status || 500);
    }
    
    // Return successful response
    return createResponse(result);
    
  } catch (error) {
    console.error("Uncaught error in manage-client-profile:", error);
    return createResponse({
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    }, 500);
  }
});
