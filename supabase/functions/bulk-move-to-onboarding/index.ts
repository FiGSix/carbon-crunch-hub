import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface BulkMoveRequest {
  proposalIds: string[];
}

interface BulkMoveResult {
  success: boolean;
  totalRequested: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ proposalId: string; error: string }>;
  results: Array<{ proposalId: string; title: string; status: string }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      console.error('Admin check failed:', profileError);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { proposalIds }: BulkMoveRequest = await req.json();

    if (!proposalIds || !Array.isArray(proposalIds) || proposalIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request - proposalIds array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing bulk move for ${proposalIds.length} proposals by admin ${user.id}`);

    const result: BulkMoveResult = {
      success: true,
      totalRequested: proposalIds.length,
      successCount: 0,
      failureCount: 0,
      errors: [],
      results: []
    };

    // Process each proposal
    for (const proposalId of proposalIds) {
      try {
        // Get proposal details first
        const { data: proposal, error: fetchError } = await supabaseAdmin
          .from('proposals')
          .select('id, title, status, deleted_at, archived_at')
          .eq('id', proposalId)
          .single();

        if (fetchError || !proposal) {
          throw new Error(`Proposal not found: ${proposalId}`);
        }

        if (proposal.deleted_at || proposal.archived_at) {
          throw new Error('Cannot move deleted or archived proposal');
        }

        // Update proposal status and set signed_at
        const { error: updateError } = await supabaseAdmin
          .from('proposals')
          .update({
            status: 'signed',
            signed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', proposalId);

        if (updateError) {
          throw new Error(`Failed to update proposal: ${updateError.message}`);
        }

        // Create or update project_onboarding record
        const { error: onboardingError } = await supabaseAdmin
          .from('project_onboarding')
          .upsert({
            proposal_id: proposalId,
            onboarding_complete: false,
            data_access_verified: false,
            audit_ready: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'proposal_id'
          });

        if (onboardingError) {
          throw new Error(`Failed to create onboarding record: ${onboardingError.message}`);
        }

        // Log the automation action
        await supabaseAdmin
          .from('proposal_automation_log')
          .insert({
            proposal_id: proposalId,
            automation_type: 'bulk_move_to_onboarding',
            trigger_event: 'admin_bulk_action',
            old_status: proposal.status,
            new_status: 'signed',
            created_by: user.id,
            details: {
              action: 'bulk_move_to_onboarding',
              performed_by: user.id,
              timestamp: new Date().toISOString()
            }
          });

        result.successCount++;
        result.results.push({
          proposalId,
          title: proposal.title,
          status: 'success'
        });

        console.log(`Successfully processed proposal ${proposalId}`);
      } catch (error) {
        console.error(`Error processing proposal ${proposalId}:`, error);
        result.failureCount++;
        result.errors.push({
          proposalId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        result.results.push({
          proposalId,
          title: 'Unknown',
          status: 'failed'
        });
      }
    }

    result.success = result.successCount > 0;

    console.log(`Bulk move complete: ${result.successCount} succeeded, ${result.failureCount} failed`);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Bulk move to onboarding error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        success: false
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
