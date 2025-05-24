
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🩺 Health check invoked`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const response = {
      status: 'healthy',
      timestamp,
      environment: {
        hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
        hasSupabaseAnonKey: !!Deno.env.get('SUPABASE_ANON_KEY'),
      },
      deployment: 'successful'
    };

    console.log(`[${timestamp}] ✅ Health check passed:`, response);

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error(`[${timestamp}] ❌ Health check failed:`, error);
    
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        timestamp,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
};

serve(handler);
