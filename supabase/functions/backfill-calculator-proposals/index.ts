import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all calculator results with user_id but no proposal_id
    const { data: results, error: fetchError } = await supabase
      .from('calculator_results')
      .select('id, email, name, system_size_kwp, user_id')
      .not('user_id', 'is', null)
      .is('proposal_id', null);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${results?.length || 0} calculator results needing proposals`);

    const created = [];
    const errors = [];

    // Process each result
    if (results && results.length > 0) {
      for (const result of results) {
        try {
          // Call the database function to create proposal
          const { data: proposalId, error: createError } = await supabase
            .rpc('create_proposal_from_calculator_result', {
              p_calculator_result_id: result.id
            });

          if (createError) {
            console.error(`Failed to create proposal for ${result.email}:`, createError);
            errors.push({
              email: result.email,
              error: createError.message
            });
          } else if (proposalId) {
            console.log(`Created proposal ${proposalId} for ${result.email}`);
            created.push({
              email: result.email,
              name: result.name,
              systemSize: result.system_size_kwp,
              proposalId
            });
          }
        } catch (err) {
          console.error(`Error processing ${result.email}:`, err);
          errors.push({
            email: result.email,
            error: err.message
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results?.length || 0} calculator results`,
        created: created.length,
        failed: errors.length,
        details: {
          created,
          errors
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
