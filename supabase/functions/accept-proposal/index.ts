import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProjectDetailsInput {
  systemAddress?: string;
  systemLat?: number | null;
  systemLng?: number | null;
  commissioningDate?: string;
  installerCompanyName?: string;
  installerEmail?: string;
}

interface AcceptProposalRequest {
  token?: string;
  proposalId?: string;
  typedName: string;
  signatureImage?: string;
  signatureType?: 'canvas' | 'typed_name';
  ipAddress?: string;
  userAgent?: string;
  projectDetails?: ProjectDetailsInput;
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

    const {
      token,
      proposalId,
      typedName,
      signatureImage,
      signatureType = 'typed_name',
      ipAddress,
      userAgent,
      projectDetails,
    }: AcceptProposalRequest = await req.json();

    // Sanitize IP for Postgres `inet` columns — empty string is invalid (22P02).
    const sanitizeIp = (v: unknown): string | null => {
      if (typeof v !== 'string') return null;
      const t = v.trim();
      return t.length > 0 ? t : null;
    };
    const headerIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      null;
    const safeIp = sanitizeIp(headerIp) ?? sanitizeIp(ipAddress);

    // Enhanced logging for debugging
    console.log('📥 Request payload:', {
      hasToken: !!token,
      hasProposalId: !!proposalId,
      typedName: typedName,
      typedNameLength: typedName?.length,
      signatureType: signatureType,
      hasSignatureImage: !!signatureImage,
      signatureImagePrefix: signatureImage?.substring(0, 30)
    });

    if (!token && !proposalId) {
      console.error('❌ Missing both token and proposalId');
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

    // 2. Master-agreement propagation (stamping the client + approving sibling proposals
    //    + cloning the agreement onto each sibling) is handled by the
    //    propagate_master_agreement() DB trigger on INSERT into proposal_agreements.


    // 3. Validate proposal status for new signatures
    console.log('🔍 Validating proposal status:', proposal.status);
    
    if (proposal.status === 'approved' || proposal.status === 'signed') {
      console.error('❌ Proposal already signed:', proposal.id);
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
      console.error('❌ Proposal already rejected:', proposal.id);
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

    // 4. Validate typed name (conditional based on signature type)
    console.log('🔍 Validating signature:', { 
      signatureType,
      typedName, 
      typedNameLength: typedName?.length,
      hasSignatureImage: !!signatureImage
    });
    
    // Only require typed name if signature type is 'typed_name'
    if (signatureType === 'typed_name' && (!typedName || typedName.trim().length < 2)) {
      console.error('❌ Invalid typed name for typed signature:', { typedName, length: typedName?.length });
      return new Response(
        JSON.stringify({ 
          error: "Please provide a valid name (minimum 2 characters) when using typed signature",
          validation: 'typedName',
          received: typedName
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // For canvas signatures, typed name is optional
    console.log(`✅ Signature validation passed for ${signatureType} signature`);

    // Get signed_by from proposal or from authenticated user
    console.log('🔍 Finding signedBy:', { 
      client_reference_id: proposal.client_reference_id,
      client_id: proposal.client_id 
    });
    
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
        console.log('🔍 Got signedBy from authenticated user:', signedBy);
      }
    }
    
    if (!signedBy) {
      console.error("❌ No client reference found for proposal:", proposal.id);
      return new Response(
        JSON.stringify({ 
          error: "Invalid proposal configuration - no client reference",
          validation: 'signedBy'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('✅ signedBy identified:', signedBy);

    // Upload signature image if provided. We persist the STORAGE PATH (not a public URL)
    // because the `signed-agreements` bucket is private; consumers mint signed URLs on demand.
    let signatureImageUrl: string | null = null;
    if (signatureImage && signatureType === 'canvas') {
      console.log(`📸 Uploading signature image for proposal ${proposal.id}`, {
        imageLength: signatureImage.length,
        imagePrefix: signatureImage.substring(0, 50)
      });
      try {
        const base64Data = signatureImage.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

        const fileName = `signature_${proposal.id}_${Date.now()}.png`;
        const filePath = `signatures/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('signed-agreements')
          .upload(filePath, buffer, {
            contentType: 'image/png',
            upsert: false
          });

        if (uploadError) {
          console.error('❌ Error uploading signature image:', uploadError);
        } else {
          // Store the storage path; AgreementTab/get-pdf-signed-url will create a signed URL on read.
          signatureImageUrl = filePath;
          console.log(`✅ Signature image uploaded at path: ${filePath}`);
        }
      } catch (uploadErr) {
        console.error('❌ Exception uploading signature:', uploadErr);
      }
    }

    // 5. Create agreement record with automatic system witnesses
    const witnessTimestamp = new Date().toISOString();
    
    // Map frontend signature type to database enum
    const dbSignatureType = signatureType === 'canvas' ? 'electronic_signature' : 'typed_name';
    
    // Check for existing agreement to prevent duplicates from retries
    const { data: existingAgreement } = await supabase
      .from('proposal_agreements')
      .select('id')
      .eq('proposal_id', proposal.id)
      .limit(1)
      .single();
    
    let newAgreement;
    
    if (existingAgreement) {
      console.log(`⚠️ Agreement already exists for proposal ${proposal.id}: ${existingAgreement.id}, reusing it`);
      newAgreement = existingAgreement;
    } else {
      const { data: createdAgreement, error: agreementError } = await supabase
        .from('proposal_agreements')
        .insert({
          proposal_id: proposal.id,
          signed_by: signedBy,
          signature_type: dbSignatureType,
          signature_image_url: signatureImageUrl,
          typed_name: typedName?.trim() || null,
          ip_address: safeIp,
          user_agent: userAgent,
          accepted_terms_version: '2.0',
          witness_1_name: 'DIGITAL WITNESS 1',
          witness_1_verified_at: witnessTimestamp,
          witness_1_ip_address: safeIp,
          witness_2_name: 'DIGITAL WITNESS 2',
          witness_2_verified_at: witnessTimestamp,
          witness_2_ip_address: safeIp,
          witness_method: 'automatic_system',
          metadata: {
            signed_via: token ? 'acceptance_link' : 'authenticated_user',
            token_used: token ? token.substring(0, 8) + '...' : null,
            proposal_id_used: proposalId || null,
            timestamp: new Date().toISOString(),
            signing_location: 'South Africa',
            witness_info: {
              method: 'automatic_system',
              witness_1: 'DIGITAL WITNESS 1',
              witness_2: 'DIGITAL WITNESS 2',
              witnessed_at: witnessTimestamp
            }
          }
        })
        .select()
        .single();

      if (agreementError || !createdAgreement) {
        console.error("Error creating agreement:", agreementError);
        throw new Error("Failed to record agreement");
      }
      newAgreement = createdAgreement;
    }

    console.log(`✅ Agreement created with ID: ${newAgreement.id}`);

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

    console.log(`✅ Proposal ${proposal.id} successfully signed via ${signatureType}`);

    // 7. Master-agreement propagation (client.cession_signed_at, first_agreement_id,
    //    sibling proposal approval, and cloned agreement rows) is performed by the
    //    propagate_master_agreement() DB trigger on INSERT into proposal_agreements.


    // 9. Generate signed agreement PDF in background
    (async () => {
      try {
        console.log('🖊️ Generating signed agreement PDF...');
        
        const { data: signedPdfResult, error: pdfError } = await supabase.functions.invoke(
          'generate-signed-agreement-pdf',
          {
            body: { 
              proposalId: proposal.id,
              agreementId: newAgreement.id
            }
          }
        );

        if (pdfError) {
          console.error('❌ Failed to generate signed PDF:', pdfError);
        } else {
          console.log('✅ Signed agreement PDF generated:', signedPdfResult?.signed_pdf_url);
        }
      } catch (error) {
        console.error('❌ Error in signed PDF generation:', error);
      }
    })();

    // 10. Mark invitation as viewed (for analytics) - only if token was used
    if (token) {
      await supabase.rpc('mark_invitation_viewed', { token_param: token });
    }

    // 11. Send cession agreement confirmation email in background
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
