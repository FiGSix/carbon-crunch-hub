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

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    // Create admin client
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { userId } = await req.json();
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing userId parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if requesting user is admin
    const { data: adminCheck } = await supabase
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

    // Log deletion attempt before execution
    console.log('Inserting audit log...');
    const { error: auditError } = await supabaseAdmin.from('user_role_audit').insert({
      user_id: userId,
      role: targetProfile.role,
      action: 'deleted',
      performed_by: user.id
    });

    if (auditError) {
      console.error('Audit log insertion failed:', auditError);
      // Continue anyway - audit failure shouldn't block deletion
    }
    console.log('Audit log inserted successfully');

    // Preserve business records - update proposals to nullify agent_id
    console.log('Updating proposals where user is agent...');
    const { data: agentProposals, error: agentProposalsError } = await supabaseAdmin
      .from('proposals')
      .update({ 
        agent_id: null,
        last_modified_by: user.id
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
        client_id: null,
        last_modified_by: user.id
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

    // Handle onboarding documents
    console.log('Handling onboarding documents...');
    const { data: docs, error: docsError } = await supabaseAdmin
      .from('onboarding_documents')
      .update({ uploaded_by: null })
      .eq('uploaded_by', userId)
      .select('id');

    if (docsError) {
      console.error('Onboarding documents update failed:', docsError);
    }
    console.log(`Nullified uploaded_by in ${docs?.length || 0} documents`);

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

    // Delete user from auth.users (cascades to profiles, user_roles, etc.)
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