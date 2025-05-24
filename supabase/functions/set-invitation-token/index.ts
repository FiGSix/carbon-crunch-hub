
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
  console.log(`[${new Date().toISOString()}] set-invitation-token function called with method: ${req.method}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseAnonKey: !!supabaseAnonKey
    });

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing required environment variables');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { 
        headers: { Authorization: req.headers.get('Authorization') ?? '' } 
      }
    });

    // Parse request body
    const requestBody = await req.json() as RequestBody;
    const { token } = requestBody;

    console.log(`Processing invitation token: ${token ? token.substring(0, 8) + '...' : 'undefined'}`);

    if (!token) {
      console.error('No token provided in request body');
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

    // Set the token in the session using RPC
    console.log('Setting token in session via RPC...');
    const { data: tokenSetResult, error: tokenError } = await supabaseClient.rpc(
      'set_request_invitation_token',
      { token }
    );

    if (tokenError) {
      console.error('Error setting token in session:', tokenError);
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

    console.log('Token set in session successfully:', tokenSetResult);

    // Validate the token to check if it corresponds to a valid proposal
    console.log('Validating token...');
    const { data: validationData, error: validationError } = await supabaseClient.rpc(
      'validate_invitation_token',
      { token }
    );

    if (validationError) {
      console.error('Token validation error:', validationError);
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

    console.log('Validation result:', validationData);

    // Check if validation returned a proposal ID
    const proposalId = validationData?.[0]?.proposal_id;
    const clientEmail = validationData?.[0]?.client_email;
    const valid = !!proposalId;

    if (!valid) {
      console.log('Token validation failed - no proposal found');
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

    console.log(`Token validation successful - proposal: ${proposalId}, client: ${clientEmail}`);
    
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
    console.error('Unexpected error in set-invitation-token function:', error);
    
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
