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

    console.log('[Backfill] Starting stale proposal backfill process...');

    // Parse request body for options
    let dryRun = false;
    try {
      const body = await req.json();
      dryRun = body?.dryRun === true;
    } catch {
      // No body or invalid JSON - default to actual run
    }

    // Find all proposals that should be stale
    const { data: proposals, error: fetchError } = await supabase
      .from('proposals')
      .select('id, title, status, invitation_sent_at, last_engagement_at')
      .in('status', ['sent', 'delivered', 'opened', 'viewed'])
      .is('deleted_at', null)
      .is('signed_at', null)
      .not('invitation_sent_at', 'is', null);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`[Backfill] Found ${proposals?.length || 0} proposals in actionable statuses`);

    // Filter to those 10+ days inactive
    const staleDays = 10;
    const now = new Date();
    const staleProposals = (proposals || []).filter(p => {
      const lastActivity = p.last_engagement_at || p.invitation_sent_at;
      if (!lastActivity) return false;
      const daysSince = (now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince >= staleDays;
    });

    console.log(`[Backfill] ${staleProposals.length} proposals are stale (10+ days inactive)`);

    if (dryRun) {
      // Return preview without making changes
      const preview = staleProposals.map(p => ({
        id: p.id,
        title: p.title,
        currentStatus: p.status,
        daysSinceActivity: Math.floor(
          (now.getTime() - new Date(p.last_engagement_at || p.invitation_sent_at).getTime()) / 
          (1000 * 60 * 60 * 24)
        )
      }));

      return new Response(JSON.stringify({
        success: true,
        dryRun: true,
        message: `Would update ${staleProposals.length} proposals to stale`,
        preview
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update each proposal to stale with proper logging
    let updatedCount = 0;
    const errors: Array<{ id: string; title: string; error: string }> = [];

    for (const proposal of staleProposals) {
      try {
        // Use RPC to update with proper logging
        const { error: updateError } = await supabase.rpc('update_proposal_status_with_log', {
          p_proposal_id: proposal.id,
          p_new_status: 'stale',
          p_trigger_event: 'backfill_stale_status',
          p_is_automated: true
        });

        if (updateError) {
          console.error(`[Backfill] Failed to update ${proposal.id}:`, updateError);
          errors.push({
            id: proposal.id,
            title: proposal.title,
            error: updateError.message
          });
        } else {
          console.log(`[Backfill] ✅ Updated ${proposal.id} (${proposal.title}) from ${proposal.status} to stale`);
          updatedCount++;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[Backfill] Error updating ${proposal.id}:`, errorMsg);
        errors.push({
          id: proposal.id,
          title: proposal.title,
          error: errorMsg
        });
      }
    }

    const result = {
      success: true,
      dryRun: false,
      totalChecked: proposals?.length || 0,
      staleFound: staleProposals.length,
      updated: updatedCount,
      errors: errors.length,
      errorDetails: errors.length > 0 ? errors : undefined
    };

    console.log('[Backfill] Complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Backfill] Error:', error);
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
