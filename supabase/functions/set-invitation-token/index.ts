
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";
import { parseRequest } from "./request-parser.ts";
import { validateTokenDirect, markInvitationAsViewed } from "./validation.ts";
import { 
  createCorsResponse, 
  createErrorResponse, 
  createSuccessResponse,
  FUNCTION_VERSION,
  DEPLOYMENT_TIMESTAMP
} from "./responses.ts";

const handler = async (req: Request): Promise<Response> => {
  const timestamp = new Date().toISOString();
  const requestId = crypto.randomUUID().substring(0, 8);
  
  console.log(`[${timestamp}] [${requestId}] 🚀 FUNCTION START - set-invitation-token ${FUNCTION_VERSION}`);
  console.log(`[${timestamp}] [${requestId}] 🔧 DEPLOYMENT TIME: ${DEPLOYMENT_TIMESTAMP}`);
  console.log(`[${timestamp}] [${requestId}] Method: ${req.method}, URL: ${req.url}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[${timestamp}] [${requestId}] ✅ CORS preflight handled`);
    return createCorsResponse();
  }

  try {
    // Create Supabase client
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

    // Parse and validate request
    let requestBody;
    try {
      requestBody = await parseRequest(req);
    } catch (parseError) {
      console.error(`[${timestamp}] [${requestId}] ❌ Parse error:`, parseError);
      return createErrorResponse(
        parseError instanceof Error ? parseError.message : 'Invalid request format'
      );
    }

    const { token, email } = requestBody;

    // Basic token validation
    if (!token || typeof token !== 'string' || token.trim() === '') {
      console.error(`[${timestamp}] [${requestId}] ❌ Invalid token provided`);
      return createErrorResponse('Token must be a non-empty string');
    }

    console.log(`[${timestamp}] [${requestId}] 🔍 Processing token: ${token.substring(0, 8)}... ${email ? `for email: ${email.substring(0, 3)}***` : '(no email provided)'}`);

    // Validate token using direct validation
    const validationResult = await validateTokenDirect(token, supabaseClient);

    if (!validationResult.is_valid) {
      console.log(`[${timestamp}] [${requestId}] ⚠️ Invalid token`);
      return createSuccessResponse(
        false,
        undefined,
        undefined,
        'This invitation link is invalid or has expired'
      );
    }

    // Mark invitation as viewed (non-blocking)
    markInvitationAsViewed(token, supabaseClient);

    console.log(`[${timestamp}] [${requestId}] 🎉 SUCCESS - proposal: ${validationResult.proposal_id}, client: ${validationResult.client_email}`);
    
    return createSuccessResponse(
      true,
      validationResult.proposal_id,
      validationResult.client_email
    );

  } catch (error) {
    console.error(`[${timestamp}] [${requestId}] 💥 Unexpected error:`, error);
    console.error(`[${timestamp}] [${requestId}] Error stack:`, error instanceof Error ? error.stack : 'No stack');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return createErrorResponse(errorMessage, 500);
  }
};

serve(handler);
