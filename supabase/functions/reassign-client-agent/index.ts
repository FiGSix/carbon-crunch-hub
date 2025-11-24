import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token for auth check
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get the current user and verify they're an admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      console.error('Not admin:', profileError);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const { clientId, newAgentId } = await req.json();

    if (!clientId || !newAgentId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: clientId, newAgentId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Reassigning client:', { clientId, newAgentId, adminId: user.id });

    // Step 1: Get the client and verify it exists
    const { data: client, error: clientFetchError } = await supabaseAdmin
      .from('clients')
      .select('id, email, user_id, created_by')
      .eq('id', clientId)
      .single();

    if (clientFetchError || !client) {
      console.error('Client fetch error:', clientFetchError);
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Update the client's created_by field
    const { error: clientUpdateError } = await supabaseAdmin
      .from('clients')
      .update({
        created_by: newAgentId,
        updated_at: new Date().toISOString(),
        last_modified_by: user.id,
      })
      .eq('id', clientId);

    if (clientUpdateError) {
      console.error('Client update error:', clientUpdateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update client' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Update all associated proposals
    // Find proposals where client_reference_id matches OR client_id matches the client's user_id
    const { data: proposals, error: proposalsFetchError } = await supabaseAdmin
      .from('proposals')
      .select('id')
      .or(`client_reference_id.eq.${clientId},client_id.eq.${client.user_id}`)
      .is('deleted_at', null);

    if (proposalsFetchError) {
      console.error('Proposals fetch error:', proposalsFetchError);
      // Continue anyway, the client was updated
    }

    let updatedProposalsCount = 0;
    if (proposals && proposals.length > 0) {
      const proposalIds = proposals.map(p => p.id);
      
      const { error: proposalsUpdateError, count } = await supabaseAdmin
        .from('proposals')
        .update({
          agent_id: newAgentId,
          updated_at: new Date().toISOString(),
          last_modified_by: user.id,
        })
        .in('id', proposalIds);

      if (proposalsUpdateError) {
        console.error('Proposals update error:', proposalsUpdateError);
        return new Response(
          JSON.stringify({ 
            error: 'Client updated but failed to update proposals',
            updatedProposalsCount: 0 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      updatedProposalsCount = count || proposals.length;
    }

    console.log('Reassignment complete:', { 
      clientId, 
      newAgentId, 
      updatedProposalsCount 
    });

    return new Response(
      JSON.stringify({
        success: true,
        updatedProposalsCount,
        message: `Client reassigned successfully. ${updatedProposalsCount} proposal(s) updated.`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
