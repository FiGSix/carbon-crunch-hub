import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  clientId: string;
  clientSharePercentage: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is agent or admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !['agent', 'admin'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only agents and admins can update portfolio client share' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { clientId, clientSharePercentage } = body;

    // Validate input
    if (!clientId || clientSharePercentage === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: clientId, clientSharePercentage' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (clientSharePercentage < 0 || clientSharePercentage > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid client share percentage: must be between 0 and 100' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Updating portfolio client share:', { clientId, clientSharePercentage, userId: user.id });

    // 1. Update clients table with portfolio override
    const { error: clientUpdateError } = await supabase
      .from('clients')
      .update({
        portfolio_client_share_override: clientSharePercentage,
        portfolio_override_set_at: new Date().toISOString(),
        portfolio_override_set_by: user.id,
      })
      .eq('id', clientId);

    if (clientUpdateError) {
      console.error('Error updating client:', clientUpdateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update client portfolio override' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch all proposals for this client
    const { data: proposals, error: proposalsError } = await supabase
      .from('proposals')
      .select('id')
      .or(`client_id.eq.${clientId},client_reference_id.eq.${clientId}`)
      .is('deleted_at', null)
      .is('archived_at', null);

    if (proposalsError) {
      console.error('Error fetching proposals:', proposalsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch proposals' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!proposals || proposals.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          clientId,
          proposalsUpdated: 0,
          portfolioOverride: clientSharePercentage,
          message: 'Portfolio override set, but no proposals found to update',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Bulk update all proposals
    const proposalIds = proposals.map(p => p.id);
    const { error: updateError } = await supabase
      .from('proposals')
      .update({
        client_share_percentage: clientSharePercentage,
        client_share_override_enabled: true,
        client_share_override_set_by: user.id,
        client_share_override_set_at: new Date().toISOString(),
        last_modified_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .in('id', proposalIds);

    if (updateError) {
      console.error('Error bulk updating proposals:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update proposals' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully updated portfolio client share:', {
      clientId,
      proposalsUpdated: proposalIds.length,
      portfolioOverride: clientSharePercentage,
    });

    return new Response(
      JSON.stringify({
        success: true,
        clientId,
        proposalsUpdated: proposalIds.length,
        portfolioOverride: clientSharePercentage,
        message: `Successfully updated ${proposalIds.length} proposal${proposalIds.length !== 1 ? 's' : ''} for client`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
