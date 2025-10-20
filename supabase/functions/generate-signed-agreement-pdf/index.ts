import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SignedAgreementRequest {
  proposalId: string;
  agreementId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { proposalId, agreementId }: SignedAgreementRequest = await req.json();

    console.log(`[Signed PDF] Generating signed agreement PDF for proposal: ${proposalId}, agreement: ${agreementId}`);

    // 1. Fetch proposal data
    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from('proposals')
      .select(`
        *,
        agent:profiles!proposals_agent_id_fkey(first_name, last_name, company_name, email),
        client:clients!proposals_client_reference_id_fkey(first_name, last_name, email, company_name)
      `)
      .eq('id', proposalId)
      .single();

    if (proposalError || !proposal) {
      console.error('[Signed PDF] Error fetching proposal:', proposalError);
      return new Response(
        JSON.stringify({ error: 'Proposal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch agreement record
    const { data: agreement, error: agreementError } = await supabaseAdmin
      .from('proposal_agreements')
      .select('*')
      .eq('id', agreementId)
      .single();

    if (agreementError || !agreement) {
      console.error('[Signed PDF] Error fetching agreement:', agreementError);
      return new Response(
        JSON.stringify({ error: 'Agreement not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Signed PDF] Agreement fetched: signed by ${agreement.typed_name}`);

    // 3. Ensure base proposal PDF exists
    if (!proposal.pdf_url) {
      console.log('[Signed PDF] Base PDF does not exist, generating it first...');
      const { data: pdfResult, error: pdfError } = await supabaseAdmin.functions.invoke(
        'generate-proposal-pdf',
        { body: { proposalId, forceRegenerate: false } }
      );

      if (pdfError || !pdfResult?.pdf_url) {
        console.error('[Signed PDF] Failed to generate base PDF:', pdfError);
        return new Response(
          JSON.stringify({ error: 'Failed to generate base proposal PDF' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      proposal.pdf_url = pdfResult.pdf_url;
    }

    // 4. Fetch the base PDF
    console.log(`[Signed PDF] Fetching base PDF from: ${proposal.pdf_url}`);
    const pdfResponse = await fetch(proposal.pdf_url);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch base PDF: ${pdfResponse.status}`);
    }
    const basePdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());

    // 5. Generate signed PDF using pdf-lib
    const signedPdfBytes = await generateSignedPdf(
      basePdfBytes, 
      proposal, 
      agreement,
      agreement.signature_image_url
    );

    // 6. Upload signed PDF to storage
    const fileName = `signed_agreement_${proposalId}_${agreementId}.pdf`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('signed-agreements')
      .upload(fileName, signedPdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('[Signed PDF] Error uploading signed PDF:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload signed PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('signed-agreements')
      .getPublicUrl(fileName);

    console.log(`[Signed PDF] Signed PDF uploaded successfully: ${publicUrl}`);

    // 8. Update agreement record with signed PDF URL
    const { error: updateError } = await supabaseAdmin
      .from('proposal_agreements')
      .update({ signed_pdf_url: publicUrl })
      .eq('id', agreementId);

    if (updateError) {
      console.error('[Signed PDF] Error updating agreement with PDF URL:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        signed_pdf_url: publicUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Signed PDF] Error in generate-signed-agreement-pdf:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate signed PDF' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateSignedPdf(
  basePdfBytes: Uint8Array, 
  proposal: any, 
  agreement: any,
  signatureImageUrl?: string | null
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb, degrees } = await import('https://esm.sh/pdf-lib@1.17.1');

  console.log('[Signed PDF] Loading base PDF document');
  const pdfDoc = await PDFDocument.load(basePdfBytes);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const crunchYellow = rgb(1, 0.804, 0.012);
  const crunchCharcoal = rgb(0.137, 0.122, 0.125);

  // Extract initials from typed name
  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return parts.map(p => p[0]).join('').toUpperCase();
  };

  const initials = getInitials(agreement.typed_name);

  console.log(`[Signed PDF] Adding watermark and initials (${initials}) to ${pages.length} pages`);

  // Add watermark and initials to all pages
  pages.forEach((page, index) => {
    const { width, height } = page.getSize();

    // Add "SIGNED COPY" watermark
    page.drawText('SIGNED COPY', {
      x: width / 2 - 100,
      y: height / 2,
      size: 60,
      font: bold,
      color: rgb(0.9, 0.9, 0.9),
      rotate: degrees(45),
      opacity: 0.3,
    });

    // Add initials box at bottom right
    page.drawText(`Initials: ${initials}`, {
      x: width - 150,
      y: 30,
      size: 10,
      font,
      color: crunchCharcoal,
    });

    // Add page number
    page.drawText(`Page ${index + 1} of ${pages.length}`, {
      x: width / 2 - 40,
      y: 30,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  });

  // Create signature page
  console.log('[Signed PDF] Creating signature page');
  const sigPage = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const { width, height } = sigPage.getSize();

  // Yellow header
  sigPage.drawRectangle({
    x: 0,
    y: height - 100,
    width,
    height: 100,
    color: crunchYellow,
  });

  sigPage.drawText('DIGITAL SIGNATURE CONFIRMATION', {
    x: 50,
    y: height - 60,
    size: 24,
    font: bold,
    color: crunchCharcoal,
  });

  let y = height - 150;
  const leftMargin = 50;
  const lineHeight = 25;

  // Helper for drawing labels and values
  const drawLabelValue = (label: string, value: string, yPos: number) => {
    sigPage.drawText(label, {
      x: leftMargin,
      y: yPos,
      size: 11,
      font: bold,
      color: rgb(0.4, 0.4, 0.4),
    });
    sigPage.drawText(value, {
      x: leftMargin + 200,
      y: yPos,
      size: 11,
      font,
      color: crunchCharcoal,
    });
  };

  // Embed signature image if provided
  let signatureImage = null;
  if (signatureImageUrl && agreement.signature_type_used === 'canvas') {
    try {
      console.log('[Signed PDF] Fetching signature image:', signatureImageUrl);
      const sigImageResponse = await fetch(signatureImageUrl);
      if (sigImageResponse.ok) {
        const sigImageBytes = await sigImageResponse.arrayBuffer();
        signatureImage = await pdfDoc.embedPng(new Uint8Array(sigImageBytes));
        console.log('[Signed PDF] Signature image embedded successfully');
      }
    } catch (err) {
      console.error('[Signed PDF] Error embedding signature image:', err);
    }
  }

  // Signature section
  sigPage.drawText('SIGNATURE', {
    x: leftMargin,
    y: y,
    size: 14,
    font: bold,
    color: crunchCharcoal,
  });
  y -= lineHeight + 10;

  // Draw signature (image or typed name)
  if (signatureImage && agreement.signature_type_used === 'canvas') {
    sigPage.drawImage(signatureImage, {
      x: leftMargin,
      y: y - 60,
      width: 200,
      height: 50,
    });
    
    sigPage.drawLine({
      start: { x: leftMargin, y: y - 65 },
      end: { x: leftMargin + 200, y: y - 65 },
      thickness: 1,
      color: rgb(0.3, 0.3, 0.3),
    });
    
    sigPage.drawText('(Drawn Signature)', {
      x: leftMargin,
      y: y - 80,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    
    y -= 95;
  } else {
    drawLabelValue('Signed By:', agreement.typed_name || 'N/A', y);
    y -= lineHeight;
  }

  drawLabelValue('Typed Name:', agreement.typed_name || 'N/A', y);
  y -= lineHeight;

  const signedDate = new Date(agreement.signed_at).toLocaleString('en-ZA', {
    dateStyle: 'long',
    timeStyle: 'medium',
    timeZone: 'Africa/Johannesburg'
  });
  drawLabelValue('Date & Time:', signedDate, y);
  y -= lineHeight;

  drawLabelValue('IP Address:', agreement.ip_address || 'N/A', y);
  y -= lineHeight;

  // Truncate user agent for readability
  const userAgent = agreement.user_agent || 'N/A';
  const shortUserAgent = userAgent.length > 60 ? userAgent.substring(0, 60) + '...' : userAgent;
  drawLabelValue('Device:', shortUserAgent, y);
  y -= lineHeight;

  const signingMethod = agreement.metadata?.signed_via === 'acceptance_link' 
    ? 'Invitation Link' 
    : 'Authenticated User';
  drawLabelValue('Signing Method:', signingMethod, y);
  y -= lineHeight;

  drawLabelValue('Agreement ID:', agreement.id, y);
  y -= lineHeight * 1.5;

  // Witnesses section
  sigPage.drawText('Digital Witnesses', {
    x: leftMargin,
    y: y,
    size: 14,
    font: bold,
    color: crunchCharcoal,
  });
  y -= lineHeight;

  drawLabelValue('Witness 1:', agreement.witness_1_name, y);
  y -= 18;
  drawLabelValue('Verified:', new Date(agreement.witness_1_verified_at).toLocaleString('en-ZA'), y);
  y -= lineHeight * 1.2;

  drawLabelValue('Witness 2:', agreement.witness_2_name, y);
  y -= 18;
  drawLabelValue('Verified:', new Date(agreement.witness_2_verified_at).toLocaleString('en-ZA'), y);
  y -= lineHeight * 1.5;

  // Legal notice
  sigPage.drawRectangle({
    x: leftMargin - 10,
    y: y - 60,
    width: width - 2 * (leftMargin - 10),
    height: 80,
    color: rgb(0.95, 0.95, 0.95),
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 1,
  });

  const legalText = [
    'This document constitutes a legally binding digital signature.',
    'The signature metadata above provides verification of the signatory\'s',
    'identity and intent to be bound by the terms of this agreement.'
  ];

  legalText.forEach((line, idx) => {
    sigPage.drawText(line, {
      x: leftMargin,
      y: y - 20 - (idx * 15),
      size: 9,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  });

  console.log('[Signed PDF] Saving signed PDF');
  return await pdfDoc.save();
}
