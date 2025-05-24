
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  token: string;
}

interface ResponseBody {
  success: boolean;
  valid: boolean;
  proposalId?: string;
  clientEmail?: string;
  error?: string;
}

const handler = async (req: Request): Promise<Response> => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] set-invitation-token function called with method: ${req.method}`);
  console.log(`[${timestamp}] Request URL: ${req.url}`);
  console.log(`[${timestamp}] Request headers:`, Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[${timestamp}] Handling CORS preflight request`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log(`[${timestamp}] Environment check:`, {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseAnonKey: !!supabaseAnonKey,
      supabaseUrlPrefix: supabaseUrl?.substring(0, 20) + '...'
    });

    if (!supabaseUrl || !supabaseAnonKey) {
      const error = 'Missing required environment variables';
      console.error(`[${timestamp}] ${error}`);
      throw new Error(error);
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { 
        headers: { Authorization: req.headers.get('Authorization') ?? '' } 
      }
    });

    // Parse request body
    let requestBody: RequestBody;
    try {
      requestBody = await req.json() as RequestBody;
      console.log(`[${timestamp}] Request body parsed successfully:`, {
        hasToken: !!requestBody.token,
        tokenLength: requestBody.token?.length,
        tokenPrefix: requestBody.token?.substring(0, 8) + '...'
      });
    } catch (parseError) {
      console.error(`[${timestamp}] Error parsing request body:`, parseError);
      return new Response(
        JSON.stringify({
          success: false,
          valid: false,
          error: 'Invalid request body format'
        } as ResponseBody),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { token } = requestBody;

    if (!token) {
      console.error(`[${timestamp}] No token provided in request body`);
      return new Response(
        JSON.stringify({
          success: false,
          valid: false,
          error: 'No token provided'
        } as ResponseBody),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`[${timestamp}] Processing invitation token: ${token.substring(0, 8)}...`);

    // Set the token in the session using RPC
    console.log(`[${timestamp}] Setting token in session via RPC...`);
    const { data: tokenSetResult, error: tokenError } = await supabaseClient.rpc(
      'set_request_invitation_token',
      { token }
    );

    if (tokenError) {
      console.error(`[${timestamp}] Error setting token in session:`, tokenError);
      return new Response(
        JSON.stringify({
          success: false,
          valid: false,
          error: `Failed to set token: ${tokenError.message}`
        } as ResponseBody),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    console.log(`[${timestamp}] Token set in session successfully:`, tokenSetResult);

    // Validate the token to check if it corresponds to a valid proposal
    console.log(`[${timestamp}] Validating token...`);
    const { data: validationData, error: validationError } = await supabaseClient.rpc(
      'validate_invitation_token',
      { token }
    );

    if (validationError) {
      console.error(`[${timestamp}] Token validation error:`, validationError);
      return new Response(
        JSON.stringify({
          success: true,
          valid: false,
          error: 'Invalid or expired invitation token'
        } as ResponseBody),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    console.log(`[${timestamp}] Validation result:`, validationData);

    // Check if validation returned a proposal ID
    const proposalId = validationData?.[0]?.proposal_id;
    const clientEmail = validationData?.[0]?.client_email;
    const valid = !!proposalId;

    if (!valid) {
      console.log(`[${timestamp}] Token validation failed - no proposal found`);
      return new Response(
        JSON.stringify({
          success: true,
          valid: false,
          error: 'This invitation link is invalid or has expired'
        } as ResponseBody),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log(`[${timestamp}] Token validation successful - proposal: ${proposalId}, client: ${clientEmail}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        valid: true,
        proposalId,
        clientEmail
      } as ResponseBody),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error(`[${timestamp}] Unexpected error in set-invitation-token function:`, error);
    console.error(`[${timestamp}] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({
        success: false,
        valid: false,
        error: errorMessage
      } as ResponseBody),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
};

serve(handler);
