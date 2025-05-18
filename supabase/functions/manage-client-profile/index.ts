
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { ClientProfileRequest, corsHeaders } from "../_shared/types.ts";
import { verifyUserAuth, createResponse } from "./auth.ts";
import { processClientRequest } from "./client-operations.ts";
import { supabase as supabaseClient } from "../_shared/supabase-client.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      return createResponse({ error: 'Server configuration error' }, 500);
    }
    
    // Create Supabase client with service role key for admin privileges
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify user authorization
    const authResult = await verifyUserAuth(
      req.headers.get('Authorization'), 
      supabaseUrl, 
      supabaseServiceKey
    );
    
    if ('error' in authResult) {
      console.error("Auth error:", authResult.error);
      return createResponse({ error: authResult.error }, authResult.status || 401);
    }
    
    // Parse the request body
    let requestBody: ClientProfileRequest;
    try {
      requestBody = await req.json() as ClientProfileRequest;
      console.log("Received client request:", { 
        name: requestBody.name,
        email: requestBody.email, 
        existingClient: requestBody.existingClient 
      });
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return createResponse({ error: 'Invalid request body' }, 400);
    }
    
    // Validate input
    if (!requestBody.email) {
      return createResponse({ error: 'Email is required' }, 400);
    }
    
    // Normalize email
    requestBody.email = requestBody.email.toLowerCase().trim();
    
    // Process the client request
    const result = await processClientRequest(requestBody, authResult.userId, supabase);
    
    if ('error' in result) {
      console.error("Error processing client request:", result.error);
      return createResponse({ error: result.error }, result.status || 500);
    }
    
    // Return successful response
    console.log("Successfully processed client request:", result);
    return createResponse(result, 'isNewProfile' in result && result.isNewProfile ? 201 : 200);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Unexpected error:", errorMessage);
    return createResponse({ error: `Unexpected error: ${errorMessage}` }, 500);
  }
});
