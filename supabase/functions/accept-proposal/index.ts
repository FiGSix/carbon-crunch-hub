import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AcceptProposalRequest {
  token?: string;
  proposalId?: string;
  typedName: string;
  ipAddress?: string;
  userAgent?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, proposalId, typedName, ipAddress, userAgent }: AcceptProposalRequest = await req.json();

    if (!token && !proposalId) {
      throw new Error("Either token or proposalId is required");
    }

    console.log(`Accepting proposal with ${token ? `token: ${token.substring(0, 8)}...` : `proposalId: ${proposalId}`}`);

    let proposal: any;

    // 1. Get proposal either by token or by ID (for authenticated users)
    if (token) {
      // Token-based access
      const { data: proposalData, error: proposalError } = await supabase
        .rpc('get_proposal_by_token_direct', { token_param: token });

      if (proposalError) {
        console.error("Error fetching proposal by token:", proposalError);
        throw new Error("Invalid or expired invitation token");
      }

      if (!proposalData || proposalData.length === 0) {
        throw new Error("Proposal not found or invitation has expired");
      }

      proposal = proposalData[0];
    } else if (proposalId) {
      // Authenticated user access - query directly with RLS
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error("Authentication required");
      }

      // Create client with user's auth token for RLS
      const userSupabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: proposalData, error: proposalError } = await userSupabase
        .from('proposals')
        .select('*')
        .eq('id', proposalId)
        .single();

      if (proposalError) {
        console.error("Error fetching proposal by ID:", proposalError);
        throw new Error("Proposal not found or you don't have access");
      }

      proposal = proposalData;
    }

    // 2. Validate proposal status
    if (proposal.status === 'approved' || proposal.status === 'signed') {
      return new Response(
        JSON.stringify({ 
          error: "This proposal has already been signed",
          alreadySigned: true 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (proposal.status === 'rejected') {
      return new Response(
        JSON.stringify({ error: "This proposal has been rejected and cannot be signed" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 3. Validate token expiration (only for token-based access)
    if (token && proposal.invitation_expires_at && new Date(proposal.invitation_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Invitation link has expired" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 4. Validate typed name (basic check)
    if (!typedName || typedName.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Please provide a valid name" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get signed_by from proposal or from authenticated user
    let signedBy = proposal.client_reference_id || proposal.client_id;
    
    // If no client reference and we have auth, use the authenticated user
    if (!signedBy && !token) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const userSupabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await userSupabase.auth.getUser();
        signedBy = user?.id;
      }
    }
    
    if (!signedBy) {
      console.error("No client reference found for proposal:", proposal.id);
      throw new Error("Invalid proposal configuration");
    }

    // 5. Create agreement record with automatic system witnesses
    const witnessTimestamp = new Date().toISOString();
    const { error: agreementError } = await supabase
      .from('proposal_agreements')
      .insert({
        proposal_id: proposal.id,
        signed_by: signedBy,
        signature_type: 'typed_name',
        typed_name: typedName,
        ip_address: ipAddress,
        user_agent: userAgent,
        accepted_terms_version: '2.0',
        witness_1_name: 'ANDREW D. STOCKIL',
        witness_1_verified_at: witnessTimestamp,
        witness_1_ip_address: ipAddress,
        witness_2_name: 'JOHANITA BURGER',
        witness_2_verified_at: witnessTimestamp,
        witness_2_ip_address: ipAddress,
        witness_method: 'automatic_system',
        metadata: {
          signed_via: token ? 'acceptance_link' : 'authenticated_user',
          token_used: token ? token.substring(0, 8) + '...' : null,
          proposal_id_used: proposalId || null,
          timestamp: new Date().toISOString(),
          signing_location: 'South Africa',
          witness_info: {
            method: 'automatic_system',
            witness_1: 'ANDREW D. STOCKIL',
            witness_2: 'JOHANITA BURGER',
            witnessed_at: witnessTimestamp
          }
        }
      });

    if (agreementError) {
      console.error("Error creating agreement:", agreementError);
      throw new Error("Failed to record agreement");
    }

    // 6. Update proposal status
    const { error: updateError } = await supabase
      .from('proposals')
      .update({
        status: 'approved',
        signed_at: new Date().toISOString()
      })
      .eq('id', proposal.id);

    if (updateError) {
      console.error("Error updating proposal:", updateError);
      throw new Error("Failed to update proposal status");
    }

    console.log(`✅ Proposal ${proposal.id} successfully signed by ${typedName}`);

    // 7. Mark invitation as viewed (for analytics) - only if token was used
    if (token) {
      await supabase.rpc('mark_invitation_viewed', { token_param: token });
    }

    // 8. Send cession agreement confirmation email in background
    // Fetch client email asynchronously without blocking response
    (async () => {
      try {
        let clientEmail: string | null = null;

        // Try to get email from proposal content first
        if (proposal.content?.clientInfo?.email) {
          clientEmail = proposal.content.clientInfo.email;
        } 
        // If client_id exists, try profiles table
        else if (proposal.client_id) {
          const { data } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', proposal.client_id)
            .single();
          clientEmail = data?.email || null;
        }
        // Fallback to clients table using signedBy
        else {
          const { data } = await supabase
            .from('clients')
            .select('email')
            .eq('id', signedBy)
            .single();
          clientEmail = data?.email || null;
        }

        if (clientEmail) {
          console.log(`📧 Sending cession agreement email to ${clientEmail}`);
          
          const { data, error } = await supabase.functions.invoke('send-cession-agreement-email', {
            body: { 
              proposalId: proposal.id, 
              clientEmail: clientEmail 
            }
          });

          if (error) {
            console.error('❌ Background email send failed:', error);
          } else {
            console.log('✅ Background email sent successfully:', data);
          }
        } else {
          console.warn('⚠️ No client email found, skipping confirmation email');
        }
      } catch (bgError) {
        console.error('❌ Error in background email task:', bgError);
      }
    })(); // Immediately invoked async function - fire and forget

    return new Response(
      JSON.stringify({ 
        success: true,
        proposalId: proposal.id,
        message: "Proposal accepted successfully"
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error("Error in accept-proposal function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to accept proposal",
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
