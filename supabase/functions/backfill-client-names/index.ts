import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Starting client name backfill process...');

    // Find all proposals with their client data
    const { data: proposals, error: fetchError } = await supabase
      .from('proposals')
      .select(`
        id,
        title,
        content,
        client_reference_id,
        clients!proposals_client_reference_id_fkey (
          first_name,
          last_name
        )
      `)
      .is('deleted_at', null);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${proposals?.length || 0} total proposals to check`);

    let fixedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ id: string; title: string; error: string }> = [];

    for (const proposal of proposals || []) {
      // Check if name is missing or empty
      const currentName = proposal.content?.clientInfo?.name;
      
      if (currentName && currentName.trim().length > 0) {
        skippedCount++;
        continue; // Name exists, skip
      }

      // Get client data
      const client = proposal.clients;
      if (!client || !client.first_name || !client.last_name) {
        console.log(`⚠️  Skipping ${proposal.id} (${proposal.title}): No client data available`);
        errors.push({
          id: proposal.id,
          title: proposal.title,
          error: 'No client data available in clients table'
        });
        continue;
      }

      const fullName = `${client.first_name} ${client.last_name}`.trim();

      // Update the proposal content
      const updatedContent = {
        ...proposal.content,
        clientInfo: {
          ...(proposal.content?.clientInfo || {}),
          name: fullName
        }
      };

      const { error: updateError } = await supabase
        .from('proposals')
        .update({ content: updatedContent })
        .eq('id', proposal.id);

      if (updateError) {
        console.error(`❌ Failed to update ${proposal.id}:`, updateError);
        errors.push({
          id: proposal.id,
          title: proposal.title,
          error: updateError.message
        });
      } else {
        console.log(`✅ Fixed ${proposal.id} (${proposal.title}): "${fullName}"`);
        fixedCount++;
      }
    }

    const result = {
      success: true,
      total_checked: proposals?.length || 0,
      fixed: fixedCount,
      skipped: skippedCount,
      errors: errors.length,
      error_details: errors
    };

    console.log('Backfill complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
