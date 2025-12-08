import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract JWT token from "Bearer <token>"
    const token = authHeader.replace('Bearer ', '');
    
    // Create admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://uyjryuopuqgmsvayiccl.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Service configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify JWT token using admin client (more reliable in edge functions)
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) {
      console.error('JWT verification failed:', userError);
      return new Response(
        JSON.stringify({ success: false, error: `Authentication failed: ${userError.message}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!user) {
      console.error('No user found in JWT');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - no user in token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Authenticated user:', user.id);

    // Parse request body
    const { userId } = await req.json();
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing userId parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if requesting user is admin
    const { data: adminCheck } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!adminCheck) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin privileges required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-deletion
    if (userId === user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user details before deletion (for logging)
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('email, first_name, last_name, role')
      .eq('id', userId)
      .single();

    if (!targetProfile) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Target profile found:', { 
      userId, 
      email: targetProfile.email, 
      role: targetProfile.role 
    });

    // Skip audit log for deletion - 'deleted' action violates check constraint
    // and the user is being removed anyway
    console.log('Skipping audit log insertion (user being deleted, action not in check constraint)');

    // Preserve business records - update proposals to nullify agent_id
    console.log('Updating proposals where user is agent...');
    const { data: agentProposals, error: agentProposalsError } = await supabaseAdmin
      .from('proposals')
      .update({ 
        agent_id: null
      })
      .eq('agent_id', userId)
      .select('id');

    if (agentProposalsError) {
      console.error('Agent proposals update failed:', agentProposalsError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to update agent proposals: ${agentProposalsError.message}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`Successfully nullified agent_id in ${agentProposals?.length || 0} proposals`);

    // Also handle client_id references
    console.log('Updating proposals where user is client...');
    const { data: clientProposals, error: clientProposalsError } = await supabaseAdmin
      .from('proposals')
      .update({ 
        client_id: null
      })
      .eq('client_id', userId)
      .select('id');

    if (clientProposalsError) {
      console.error('Client proposals update failed:', clientProposalsError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to update client proposals: ${clientProposalsError.message}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`Successfully nullified client_id in ${clientProposals?.length || 0} proposals`);

    // Handle company memberships
    console.log('Checking company memberships...');
    const { data: companyMemberships, error: companyError } = await supabaseAdmin
      .from('company_members')
      .delete()
      .eq('user_id', userId)
      .select('id');

    if (companyError) {
      console.error('Company members deletion failed:', companyError);
    }
    console.log(`Removed ${companyMemberships?.length || 0} company memberships`);

    // Handle onboarding documents - DELETE instead of nullify (NOT NULL constraint on uploaded_by)
    console.log('Handling onboarding documents...');
    const { data: docs, error: docsError } = await supabaseAdmin
      .from('onboarding_documents')
      .delete()
      .eq('uploaded_by', userId)
      .select('id');

    if (docsError) {
      console.error('Onboarding documents deletion failed:', docsError);
    }
    console.log(`Deleted ${docs?.length || 0} onboarding documents`);

    // Handle project_onboarding - nullify submitted_by foreign key
    console.log('Handling project onboarding records...');
    const { data: onboardingRecords, error: onboardingError } = await supabaseAdmin
      .from('project_onboarding')
      .update({ submitted_by: null })
      .eq('submitted_by', userId)
      .select('id');

    if (onboardingError) {
      console.error('Project onboarding update failed:', onboardingError);
    }
    console.log(`Nullified submitted_by in ${onboardingRecords?.length || 0} project onboarding records`);

    // Handle clients table - nullify user_id (NO ACTION foreign key blocks auth deletion)
    console.log('Handling clients table...');
    const { data: clientRecords, error: clientsError } = await supabaseAdmin
      .from('clients')
      .update({ user_id: null })
      .eq('user_id', userId)
      .select('id');

    if (clientsError) {
      console.error('Clients user_id nullification failed:', clientsError);
    }
    console.log(`Nullified user_id in ${clientRecords?.length || 0} client records`);

    // Handle notifications - delete them
    console.log('Checking notifications...');
    const { data: notifications, error: notificationsError } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .select('id');

    if (notificationsError) {
      console.error('Notifications deletion failed:', notificationsError);
      // May be OK if CASCADE is set up
    }
    console.log(`Deleted ${notifications?.length || 0} notifications`);

    // Handle user_roles - delete explicitly
    console.log('Deleting user roles...');
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .select('role');

    if (rolesError) {
      console.error('User roles deletion failed:', rolesError);
    }
    console.log(`Deleted ${roles?.length || 0} user roles`);

    // Handle user_role_audit - delete all historical audit logs before deleting user
    console.log('Deleting user role audit logs...');
    const { data: auditLogs, error: auditDeleteError } = await supabaseAdmin
      .from('user_role_audit')
      .delete()
      .eq('user_id', userId)
      .select('id');

    if (auditDeleteError) {
      console.error('User role audit deletion failed:', auditDeleteError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to delete user audit logs: ${auditDeleteError.message}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`Deleted ${auditLogs?.length || 0} audit log entries`);

    // Handle client_company_members - delete memberships
    console.log('Deleting client company memberships...');
    const { data: clientMemberships, error: clientMembershipsError } = await supabaseAdmin
      .from('client_company_members')
      .delete()
      .eq('user_id', userId)
      .select('id');

    if (clientMembershipsError) {
      console.error('Client company memberships deletion failed:', clientMembershipsError);
    }
    console.log(`Deleted ${clientMemberships?.length || 0} client company memberships`);

    // Handle legal_document_acceptances - delete acceptances
    console.log('Deleting legal document acceptances...');
    const { data: acceptances, error: acceptancesError } = await supabaseAdmin
      .from('legal_document_acceptances')
      .delete()
      .eq('user_id', userId)
      .select('id');

    if (acceptancesError) {
      console.error('Legal document acceptances deletion failed:', acceptancesError);
    }
    console.log(`Deleted ${acceptances?.length || 0} legal document acceptances`);

    // Handle data_access_config - nullify configured_by (NO ACTION FK blocker)
    console.log('Nullifying data_access_config.configured_by...');
    const { data: dacRecords, error: dacError } = await supabaseAdmin
      .from('data_access_config')
      .update({ configured_by: null })
      .eq('configured_by', userId)
      .select('id');

    if (dacError) {
      console.error('Data access config update failed:', dacError);
    }
    console.log(`Nullified configured_by in ${dacRecords?.length || 0} data_access_config records`);

    // Handle onboarding_activity_log - delete entries (NO ACTION FK blocker)
    console.log('Deleting onboarding activity log entries...');
    const { data: activityLogs, error: activityError } = await supabaseAdmin
      .from('onboarding_activity_log')
      .delete()
      .eq('actor_id', userId)
      .select('id');

    if (activityError) {
      console.error('Onboarding activity log deletion failed:', activityError);
    }
    console.log(`Deleted ${activityLogs?.length || 0} onboarding activity log entries`);

    // Handle onboarding_comments - delete entries (NO ACTION FK blocker)
    console.log('Deleting onboarding comments...');
    const { data: comments, error: commentsError } = await supabaseAdmin
      .from('onboarding_comments')
      .delete()
      .eq('author_id', userId)
      .select('id');

    if (commentsError) {
      console.error('Onboarding comments deletion failed:', commentsError);
    }
    console.log(`Deleted ${comments?.length || 0} onboarding comments`);

    // Also handle edited_by in onboarding_comments
    console.log('Nullifying onboarding_comments.edited_by...');
    const { error: commentsEditedError } = await supabaseAdmin
      .from('onboarding_comments')
      .update({ edited_by: null })
      .eq('edited_by', userId);

    if (commentsEditedError) {
      console.error('Onboarding comments edited_by update failed:', commentsEditedError);
    }

    // Handle onboarding_tasks - nullify assigned_by, assigned_to, completed_by (NO ACTION FK blockers)
    console.log('Nullifying onboarding_tasks foreign keys...');
    const { error: tasksAssignedByError } = await supabaseAdmin
      .from('onboarding_tasks')
      .update({ assigned_by: null })
      .eq('assigned_by', userId);

    if (tasksAssignedByError) {
      console.error('Onboarding tasks assigned_by update failed:', tasksAssignedByError);
    }

    const { error: tasksAssignedToError } = await supabaseAdmin
      .from('onboarding_tasks')
      .update({ assigned_to: null })
      .eq('assigned_to', userId);

    if (tasksAssignedToError) {
      console.error('Onboarding tasks assigned_to update failed:', tasksAssignedToError);
    }

    const { error: tasksCompletedByError } = await supabaseAdmin
      .from('onboarding_tasks')
      .update({ completed_by: null })
      .eq('completed_by', userId);

    if (tasksCompletedByError) {
      console.error('Onboarding tasks completed_by update failed:', tasksCompletedByError);
    }
    console.log('Onboarding tasks foreign keys nullified');

    // Handle onboarding_fields - nullify validated_by (NO ACTION FK blocker)
    console.log('Nullifying onboarding_fields.validated_by...');
    const { error: fieldsValidatedError } = await supabaseAdmin
      .from('onboarding_fields')
      .update({ validated_by: null })
      .eq('validated_by', userId);

    if (fieldsValidatedError) {
      console.error('Onboarding fields validated_by update failed:', fieldsValidatedError);
    }

    // Handle onboarding_documents - nullify validated_by (in addition to existing uploaded_by delete)
    console.log('Nullifying onboarding_documents.validated_by...');
    const { error: docsValidatedError } = await supabaseAdmin
      .from('onboarding_documents')
      .update({ validated_by: null })
      .eq('validated_by', userId);

    if (docsValidatedError) {
      console.error('Onboarding documents validated_by update failed:', docsValidatedError);
    }

    // Handle project_onboarding - nullify additional fields (NO ACTION FK blockers)
    console.log('Nullifying additional project_onboarding foreign keys...');
    const { error: poLastModifiedError } = await supabaseAdmin
      .from('project_onboarding')
      .update({ last_modified_by: null })
      .eq('last_modified_by', userId);

    if (poLastModifiedError) {
      console.error('Project onboarding last_modified_by update failed:', poLastModifiedError);
    }

    const { error: poAuditMarkedError } = await supabaseAdmin
      .from('project_onboarding')
      .update({ audit_ready_marked_by: null })
      .eq('audit_ready_marked_by', userId);

    if (poAuditMarkedError) {
      console.error('Project onboarding audit_ready_marked_by update failed:', poAuditMarkedError);
    }

    const { error: poAdminValidatedError } = await supabaseAdmin
      .from('project_onboarding')
      .update({ admin_validated_by: null })
      .eq('admin_validated_by', userId);

    if (poAdminValidatedError) {
      console.error('Project onboarding admin_validated_by update failed:', poAdminValidatedError);
    }

    const { error: poAssignedEpcError } = await supabaseAdmin
      .from('project_onboarding')
      .update({ assigned_epc_id: null })
      .eq('assigned_epc_id', userId);

    if (poAssignedEpcError) {
      console.error('Project onboarding assigned_epc_id update failed:', poAssignedEpcError);
    }
    console.log('Project onboarding foreign keys nullified');

    // Handle proposals - nullify additional fields (NO ACTION FK blockers)
    console.log('Nullifying additional proposals foreign keys...');
    const { error: proposalsOverrideError } = await supabaseAdmin
      .from('proposals')
      .update({ client_share_override_set_by: null })
      .eq('client_share_override_set_by', userId);

    if (proposalsOverrideError) {
      console.error('Proposals client_share_override_set_by update failed:', proposalsOverrideError);
    }

    const { error: proposalsLastModifiedError } = await supabaseAdmin
      .from('proposals')
      .update({ last_modified_by: null })
      .eq('last_modified_by', userId);

    if (proposalsLastModifiedError) {
      console.error('Proposals last_modified_by update failed:', proposalsLastModifiedError);
    }

    const { error: proposalsArchivedByError } = await supabaseAdmin
      .from('proposals')
      .update({ archived_by: null })
      .eq('archived_by', userId);

    if (proposalsArchivedByError) {
      console.error('Proposals archived_by update failed:', proposalsArchivedByError);
    }

    const { error: proposalsDeletedByError } = await supabaseAdmin
      .from('proposals')
      .update({ deleted_by: null })
      .eq('deleted_by', userId);

    if (proposalsDeletedByError) {
      console.error('Proposals deleted_by update failed:', proposalsDeletedByError);
    }
    console.log('Proposals foreign keys nullified');

    // Handle clients - nullify additional fields (NO ACTION FK blockers)
    console.log('Nullifying additional clients foreign keys...');
    const { error: clientsLastModifiedError } = await supabaseAdmin
      .from('clients')
      .update({ last_modified_by: null })
      .eq('last_modified_by', userId);

    if (clientsLastModifiedError) {
      console.error('Clients last_modified_by update failed:', clientsLastModifiedError);
    }

    const { error: clientsPortfolioError } = await supabaseAdmin
      .from('clients')
      .update({ portfolio_override_set_by: null })
      .eq('portfolio_override_set_by', userId);

    if (clientsPortfolioError) {
      console.error('Clients portfolio_override_set_by update failed:', clientsPortfolioError);
    }

    const { error: clientsCreatedByError } = await supabaseAdmin
      .from('clients')
      .update({ created_by: null })
      .eq('created_by', userId);

    if (clientsCreatedByError) {
      console.error('Clients created_by update failed:', clientsCreatedByError);
    }
    console.log('Clients foreign keys nullified');

    // Handle profiles.status_changed_by (self-referencing FK)
    console.log('Nullifying profiles.status_changed_by...');
    const { error: profilesStatusError } = await supabaseAdmin
      .from('profiles')
      .update({ status_changed_by: null })
      .eq('status_changed_by', userId);

    if (profilesStatusError) {
      console.error('Profiles status_changed_by update failed:', profilesStatusError);
    }

    // Handle agent_activities
    console.log('Deleting agent activities...');
    const { data: activities, error: activitiesError } = await supabaseAdmin
      .from('agent_activities')
      .delete()
      .eq('agent_id', userId)
      .select('id');

    if (activitiesError) {
      console.error('Agent activities deletion failed:', activitiesError);
    }
    console.log(`Deleted ${activities?.length || 0} agent activities`);

    // Handle agent_commissions
    console.log('Deleting agent commissions...');
    const { data: commissions, error: commissionsError } = await supabaseAdmin
      .from('agent_commissions')
      .delete()
      .eq('agent_id', userId)
      .select('id');

    if (commissionsError) {
      console.error('Agent commissions deletion failed:', commissionsError);
    }
    console.log(`Deleted ${commissions?.length || 0} agent commissions`);

    // Nullify approved_by in agent_commissions
    const { error: commissionsApprovedError } = await supabaseAdmin
      .from('agent_commissions')
      .update({ approved_by: null })
      .eq('approved_by', userId);

    if (commissionsApprovedError) {
      console.error('Agent commissions approved_by update failed:', commissionsApprovedError);
    }

    // Handle client_referrals
    console.log('Deleting client referrals...');
    const { data: referrals, error: referralsError } = await supabaseAdmin
      .from('client_referrals')
      .delete()
      .eq('referrer_id', userId)
      .select('id');

    if (referralsError) {
      console.error('Client referrals deletion failed:', referralsError);
    }
    console.log(`Deleted ${referrals?.length || 0} client referrals`);

    // Delete profile explicitly (profiles.id references auth.users.id)
    console.log('Deleting profile...');
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Profile deletion failed:', profileError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to delete profile: ${profileError.message}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('Profile deleted successfully');

    // Delete user from auth.users
    console.log('Attempting to delete user from auth.users...');
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to delete user: ${deleteError.message}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User successfully deleted from auth.users');

    return new Response(
      JSON.stringify({ 
        success: true, 
        deletedUserId: userId,
        deletedEmail: targetProfile.email
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});