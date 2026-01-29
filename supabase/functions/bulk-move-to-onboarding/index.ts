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

// Helper function to get agent installer info
async function getAgentInstallerInfo(
  supabaseAdmin: ReturnType<typeof createClient>,
  agentId: string | null
): Promise<{ installerCompanyName: string; installerEmail: string }> {
  const defaultValue = { installerCompanyName: 'To be confirmed', installerEmail: 'To be confirmed' };
  
  if (!agentId) {
    return defaultValue;
  }

  try {
    // Get company name from companies table via company_members (priority)
    const { data: companyData } = await supabaseAdmin
      .from('company_members')
      .select('companies(company_name)')
      .eq('user_id', agentId)
      .eq('status', 'active')
      .limit(1)
      .single();

    let companyName = (companyData?.companies as { company_name: string } | null)?.company_name;

    // Fallback to profile company_name if no team membership
    if (!companyName) {
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('company_name')
        .eq('id', agentId)
        .single();
      
      companyName = profileData?.company_name;
    }

    // Get agent email
    const { data: emailData } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', agentId)
      .single();

    const agentEmail = emailData?.email;

    // Check if Crunch Carbon - default to "To be confirmed"
    if (!companyName || companyName.toLowerCase().includes('crunch carbon')) {
      return defaultValue;
    }

    return {
      installerCompanyName: companyName || 'To be confirmed',
      installerEmail: agentEmail || 'To be confirmed'
    };
  } catch (error) {
    console.error('Error fetching agent installer info:', error);
    return defaultValue;
  }
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
          .select('id, title, status, deleted_at, archived_at, agent_id')
          .eq('id', proposalId)
          .single();

        if (fetchError || !proposal) {
          throw new Error(`Proposal not found: ${proposalId}`);
        }

        if (proposal.deleted_at || proposal.archived_at) {
          throw new Error('Cannot move deleted or archived proposal');
        }

        // Get agent installer info
        const installerInfo = await getAgentInstallerInfo(supabaseAdmin, proposal.agent_id);
        console.log(`Agent installer info for proposal ${proposalId}:`, installerInfo);

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
        const { data: onboardingRecord, error: onboardingError } = await supabaseAdmin
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
          })
          .select('id')
          .single();

        if (onboardingError) {
          throw new Error(`Failed to create onboarding record: ${onboardingError.message}`);
        }

        // Get the project_id for onboarding_fields
        let projectId = onboardingRecord?.id;
        if (!projectId) {
          const { data: existingOnboarding } = await supabaseAdmin
            .from('project_onboarding')
            .select('id')
            .eq('proposal_id', proposalId)
            .single();
          projectId = existingOnboarding?.id;
        }

        // Create or update onboarding_fields with installer info
        if (projectId) {
          const { error: fieldsError } = await supabaseAdmin
            .from('onboarding_fields')
            .upsert({
              project_id: projectId,
              installer_company_name: installerInfo.installerCompanyName,
              installer_email: installerInfo.installerEmail,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'project_id'
            });

          if (fieldsError) {
            console.error(`Failed to update onboarding_fields for project ${projectId}:`, fieldsError);
            // Don't fail the entire operation, just log the error
          }
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
              installer_company_name: installerInfo.installerCompanyName,
              installer_email: installerInfo.installerEmail,
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
