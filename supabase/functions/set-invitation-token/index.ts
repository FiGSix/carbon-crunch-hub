
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// DEPLOYMENT VERIFICATION - Force new deployment with version tracking
const FUNCTION_VERSION = "v2.3.0";
const DEPLOYMENT_TIMESTAMP = new Date().toISOString();

interface RequestBody {
  token: string;
  email?: string;
}

interface ResponseBody {
  success: boolean;
  valid: boolean;
  proposalId?: string;
  clientEmail?: string;
  error?: string;
  version?: string;
  deploymentTime?: string;
}

const handler = async (req: Request): Promise<Response> => {
  const timestamp = new Date().toISOString();
  const requestId = crypto.randomUUID().substring(0, 8);
  
  console.log(`[${timestamp}] [${requestId}] 🚀 FUNCTION START - set-invitation-token ${FUNCTION_VERSION}`);
  console.log(`[${timestamp}] [${requestId}] 🔧 DEPLOYMENT TIME: ${DEPLOYMENT_TIMESTAMP}`);
  console.log(`[${timestamp}] [${requestId}] Method: ${req.method}, URL: ${req.url}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[${timestamp}] [${requestId}] ✅ CORS preflight handled`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with enhanced error handling
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log(`[${timestamp}] [${requestId}] 🔧 Environment check:`, {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseAnonKey: !!supabaseAnonKey,
      supabaseUrlPrefix: supabaseUrl?.substring(0, 30) + '...'
    });

    if (!supabaseUrl || !supabaseAnonKey) {
      const error = 'Missing required environment variables';
      console.error(`[${timestamp}] [${requestId}] ❌ ${error}`);
      throw new Error(error);
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { 
        headers: { Authorization: req.headers.get('Authorization') ?? '' } 
      }
    });

    // Enhanced request body parsing with better error handling
    let requestBody: RequestBody;
    try {
      // Log request details for debugging
      const contentType = req.headers.get('content-type');
      const contentLength = req.headers.get('content-length');
      
      console.log(`[${timestamp}] [${requestId}] 📋 Request headers:`, {
        contentType,
        contentLength,
        hasAuth: !!req.headers.get('Authorization')
      });

      const rawBody = await req.text();
      console.log(`[${timestamp}] [${requestId}] 📥 Raw body length: ${rawBody.length}`);
      
      if (!rawBody || rawBody.trim() === '') {
        console.error(`[${timestamp}] [${requestId}] ❌ Empty request body received`);
        return new Response(
          JSON.stringify({
            success: false,
            valid: false,
            error: 'Empty request body. Please ensure you are sending a valid JSON payload with a token field.',
            version: FUNCTION_VERSION,
            deploymentTime: DEPLOYMENT_TIMESTAMP
          } as ResponseBody),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        );
      }
      
      // Log first few characters for debugging (be careful not to log sensitive data)
      console.log(`[${timestamp}] [${requestId}] 📥 Body preview: ${rawBody.substring(0, 50)}${rawBody.length > 50 ? '...' : ''}`);
      
      requestBody = JSON.parse(rawBody) as RequestBody;
      console.log(`[${timestamp}] [${requestId}] ✅ Body parsed:`, {
        hasToken: !!requestBody.token,
        tokenLength: requestBody.token?.length,
        tokenPrefix: requestBody.token?.substring(0, 8) + '...',
        hasEmail: !!requestBody.email,
        email: requestBody.email ? requestBody.email.substring(0, 3) + '***' : 'none'
      });
    } catch (parseError) {
      console.error(`[${timestamp}] [${requestId}] ❌ Parse error:`, parseError);
      return new Response(
        JSON.stringify({
          success: false,
          valid: false,
          error: `Invalid request body format: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`,
          version: FUNCTION_VERSION,
          deploymentTime: DEPLOYMENT_TIMESTAMP
        } as ResponseBody),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { token, email } = requestBody;

    if (!token || token.trim() === '') {
      console.error(`[${timestamp}] [${requestId}] ❌ No token provided`);
      return new Response(
        JSON.stringify({
          success: false,
          valid: false,
          error: 'No token provided in request body',
          version: FUNCTION_VERSION,
          deploymentTime: DEPLOYMENT_TIMESTAMP
        } as ResponseBody),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`[${timestamp}] [${requestId}] 🔍 Processing token: ${token.substring(0, 8)}... ${email ? `for email: ${email.substring(0, 3)}***` : '(no email provided)'}`);

    // Step 1: Set token in session
    console.log(`[${timestamp}] [${requestId}] 📝 Setting token in session...`);
    const { data: tokenSetResult, error: tokenError } = await supabaseClient.rpc(
      'set_request_invitation_token',
      { token }
    );

    if (tokenError) {
      console.error(`[${timestamp}] [${requestId}] ❌ Token set error:`, tokenError);
      return new Response(
        JSON.stringify({
          success: false,
          valid: false,
          error: `Failed to set token: ${tokenError.message}`,
          version: FUNCTION_VERSION,
          deploymentTime: DEPLOYMENT_TIMESTAMP
        } as ResponseBody),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    console.log(`[${timestamp}] [${requestId}] ✅ Token set successfully:`, tokenSetResult);

    // Step 2: Validate token
    console.log(`[${timestamp}] [${requestId}] 🔍 Validating token...`);
    const { data: validationData, error: validationError } = await supabaseClient.rpc(
      'validate_invitation_token',
      { token }
    );

    if (validationError) {
      console.error(`[${timestamp}] [${requestId}] ❌ Validation error:`, validationError);
      return new Response(
        JSON.stringify({
          success: true,
          valid: false,
          error: 'Invalid or expired invitation token',
          version: FUNCTION_VERSION,
          deploymentTime: DEPLOYMENT_TIMESTAMP
        } as ResponseBody),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    console.log(`[${timestamp}] [${requestId}] 📊 Validation result:`, validationData);

    // Extract proposal data
    const proposalId = validationData?.[0]?.proposal_id;
    const clientEmail = validationData?.[0]?.client_email;
    const valid = !!proposalId;

    if (!valid) {
      console.log(`[${timestamp}] [${requestId}] ⚠️ No proposal found for token`);
      return new Response(
        JSON.stringify({
          success: true,
          valid: false,
          error: 'This invitation link is invalid or has expired',
          version: FUNCTION_VERSION,
          deploymentTime: DEPLOYMENT_TIMESTAMP
        } as ResponseBody),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Step 3: Mark invitation as viewed (non-blocking)
    supabaseClient.rpc('mark_invitation_viewed', { token_param: token })
      .then(({ error }) => {
        if (error) {
          console.error(`[${timestamp}] [${requestId}] ⚠️ Failed to mark as viewed:`, error);
        } else {
          console.log(`[${timestamp}] [${requestId}] ✅ Marked invitation as viewed`);
        }
      });

    console.log(`[${timestamp}] [${requestId}] 🎉 SUCCESS - proposal: ${proposalId}, client: ${clientEmail}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        valid: true,
        proposalId,
        clientEmail,
        version: FUNCTION_VERSION,
        deploymentTime: DEPLOYMENT_TIMESTAMP
      } as ResponseBody),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error(`[${timestamp}] [${requestId}] 💥 Unexpected error:`, error);
    console.error(`[${timestamp}] [${requestId}] Error stack:`, error instanceof Error ? error.stack : 'No stack');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({
        success: false,
        valid: false,
        error: errorMessage,
        version: FUNCTION_VERSION,
        deploymentTime: DEPLOYMENT_TIMESTAMP
      } as ResponseBody),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
};

serve(handler);
