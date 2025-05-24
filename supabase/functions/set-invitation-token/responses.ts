
import { ResponseBody } from "./types.ts";

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const FUNCTION_VERSION = "v3.0.0";
export const DEPLOYMENT_TIMESTAMP = new Date().toISOString();

export function createErrorResponse(
  error: string,
  status: number = 400
): Response {
  const body: ResponseBody = {
    success: false,
    valid: false,
    error,
    version: FUNCTION_VERSION,
    deploymentTime: DEPLOYMENT_TIMESTAMP
  };

  return new Response(
    JSON.stringify(body),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status 
    }
  );
}

export function createSuccessResponse(
  valid: boolean,
  proposalId?: string,
  clientEmail?: string,
  error?: string
): Response {
  const body: ResponseBody = {
    success: true,
    valid,
    proposalId,
    clientEmail,
    error,
    version: FUNCTION_VERSION,
    deploymentTime: DEPLOYMENT_TIMESTAMP
  };

  return new Response(
    JSON.stringify(body),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    }
  );
}

export function createCorsResponse(): Response {
  return new Response(null, { headers: corsHeaders });
}
