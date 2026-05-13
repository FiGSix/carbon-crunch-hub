import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { PDFDocument, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import { addCessionAgreementPages } from "../_shared/cession-agreement-pdf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate caller is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { proposalId } = await req.json();
    if (!proposalId) {
      return new Response(
        JSON.stringify({ error: 'proposalId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Cession PDF] Generating unsigned cession agreement for proposal: ${proposalId}`);

    // Fetch proposal with client and agent data
    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from('proposals')
      .select(`
        *,
        agent:profiles!proposals_agent_id_fkey(first_name, last_name, company_name, email),
        client:clients!proposals_client_reference_id_fkey(first_name, last_name, email, company_name, registration_number)
      `)
      .eq('id', proposalId)
      .single();

    if (proposalError || !proposal) {
      console.error('[Cession PDF] Error fetching proposal:', proposalError);
      return new Response(
        JSON.stringify({ error: 'Proposal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fonts = { regular: font, bold };

    await addCessionAgreementPages(pdfDoc, fonts, proposal);

    const pdfBytes = await pdfDoc.save();

    // Upload to storage
    const fileName = `cession-agreement-${proposalId}.pdf`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('proposal-pdfs')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('[Cession PDF] Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mint a short-lived signed URL for the freshly written cession PDF.
    // We do NOT route through get-pdf-signed-url because that resolves
    // `kind: 'proposal'` to proposals.pdf_url (the standard proposal PDF).
    const downloadName = `cession-agreement-${proposalId}.pdf`;
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from('proposal-pdfs')
      .createSignedUrl(fileName, 300, { download: downloadName });

    if (signErr || !signed?.signedUrl) {
      console.error('[Cession PDF] Sign URL error:', signErr);
      return new Response(
        JSON.stringify({ error: 'Failed to sign cession PDF URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Cession PDF] Generated successfully for proposal ${proposalId}`);

    return new Response(
      JSON.stringify({ success: true, signed_url: signed.signedUrl, file_name: fileName }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Cession PDF] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate cession agreement PDF' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
