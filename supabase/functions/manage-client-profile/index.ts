
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders, ErrorResponse } from "../_shared/types.ts";
import { verifyUserAuth, createResponse } from "./auth.ts";
import { findExistingClient } from "./client/client-lookup.ts";
import { createClientContact } from "./client/client-creation.ts";
import { processClient } from "./client/client-processor.ts";

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
    const { name, email, phone, companyName, existingClient } = await req.json();
    
    if (!email) {
      return createResponse({
        error: "Email is required"
      }, 400);
    }

    // Connect to Supabase with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // If marked as existing, search for existing client first
    const normalizedEmail = email.toLowerCase().trim();
    const existingClientInfo = await findExistingClient(normalizedEmail, supabase);
    
    if (existingClient && !existingClientInfo) {
      return createResponse({
        error: "Client marked as existing but not found in database",
        clientEmail: normalizedEmail
      }, 404);
    }
    
    // If we found an existing client, return it
    if (existingClientInfo) {
      return createResponse({
        clientId: existingClientInfo.clientId,
        isNewProfile: false,
        isRegisteredUser: existingClientInfo.isRegisteredUser
      });
    }
    
    // Create a new client contact if we don't have an existing client
    const clientContact = await createClientContact(
      {
        firstName: name?.split(' ')[0] || "",
        lastName: name?.split(' ').slice(1).join(' ') || "",
        email: normalizedEmail,
        phone: phone || null,
        companyName: companyName || null
      },
      userId,
      supabase
    );
    
    if (!clientContact || !clientContact.id) {
      return createResponse({
        error: "Failed to create client contact"
      }, 500);
    }
    
    // Process the client and return appropriate response
    const processResult = await processClient(clientContact, supabase);
    
    return createResponse({
      clientId: processResult.clientId,
      isNewProfile: true,
      isRegisteredUser: processResult.isRegisteredUser
    });
    
  } catch (error) {
    console.error("Uncaught error in manage-client-profile:", error);
    return createResponse({
      error: `Unexpected error: ${error.message}`
    }, 500);
  }
});
