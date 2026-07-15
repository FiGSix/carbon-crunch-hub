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

    // 4. Fetch the base PDF from storage (private bucket — use service role download)
    const basePathMatch = (proposal.pdf_url as string).match(/\/object\/(?:public|sign)\/proposal-pdfs\/([^?]+)/);
    const basePath = basePathMatch ? decodeURIComponent(basePathMatch[1]) : `proposal-${proposalId}-v${proposal.pdf_version || 1}.pdf`;
    console.log(`[Signed PDF] Downloading base PDF from storage: ${basePath}`);
    const { data: baseBlob, error: baseDlErr } = await supabaseAdmin.storage
      .from('proposal-pdfs')
      .download(basePath);
    if (baseDlErr || !baseBlob) {
      throw new Error(`Failed to download base PDF: ${baseDlErr?.message ?? 'unknown'}`);
    }
    const basePdfBytes = new Uint8Array(await baseBlob.arrayBuffer());

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
  const { addCessionAgreementPages } = await import('../_shared/cession-agreement-pdf.ts');

  console.log('[Signed PDF] Creating new PDF document');
  const pdfDoc = await PDFDocument.create();
  
  // Embed fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fonts = { regular: font, bold };

  // STEP 1: Add Cession Agreement pages
  console.log('[Signed PDF] Adding Cession Agreement pages');
  await addCessionAgreementPages(pdfDoc, fonts, proposal);

  // STEP 2: Add "ANNEXURE A" separator page
  console.log('[Signed PDF] Adding Annexure A separator');
  const separatorPage = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const { width: sepWidth, height: sepHeight } = separatorPage.getSize();
  
  // Yellow header bar
  separatorPage.drawRectangle({
    x: 0,
    y: sepHeight - 100,
    width: sepWidth,
    height: 100,
    color: rgb(1, 0.804, 0.012), // Crunch yellow
  });
  
  separatorPage.drawText('ANNEXURE A', {
    x: sepWidth / 2 - 100,
    y: sepHeight / 2 + 20,
    size: 32,
    font: bold,
    color: rgb(0.137, 0.122, 0.125), // Crunch charcoal
  });
  
  separatorPage.drawText('PROPOSAL', {
    x: sepWidth / 2 - 70,
    y: sepHeight / 2 - 20,
    size: 28,
    font: bold,
    color: rgb(0.137, 0.122, 0.125),
  });

  // STEP 3: Merge base proposal PDF pages
  console.log('[Signed PDF] Merging proposal PDF pages');
  const basePdfDoc = await PDFDocument.load(basePdfBytes);
  const copiedPages = await pdfDoc.copyPages(basePdfDoc, basePdfDoc.getPageIndices());
  copiedPages.forEach(page => pdfDoc.addPage(page));

  // STEP 4: Add watermark and initials to ALL pages
  const pages = pdfDoc.getPages();

  const crunchYellow = rgb(1, 0.804, 0.012);
  const crunchCharcoal = rgb(0.137, 0.122, 0.125);

  // Extract initials from typed name (or use default if none)
  const getInitials = (name: string | null): string => {
    if (!name || !name.trim()) return 'CC'; // Default to "CC" (Crunch Carbon) if no name
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return parts.map(p => p[0]).join('').toUpperCase();
  };

  const initials = getInitials(agreement.typed_name);
  const totalPagesBeforeSig = pages.length;

  console.log(`[Signed PDF] Adding watermark and initials (${initials}) to ${pages.length} pages`);

  // Add watermark and initials to all pages (including Cession Agreement and Proposal)
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

    // Add page number (pages before signature page)
    page.drawText(`Page ${index + 1} of ${totalPagesBeforeSig + 1}`, {
      x: width / 2 - 40,
      y: 30,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  });

  // Update total pages count after adding signature page
  const finalTotalPages = totalPagesBeforeSig + 1;

  // STEP 5: Create signature page
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

  // Add page number to signature page
  sigPage.drawText(`Page ${finalTotalPages} of ${finalTotalPages}`, {
    x: width / 2 - 40,
    y: 30,
    size: 10,
    font,
    color: rgb(0.5, 0.5, 0.5),
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

  // Embed signature image if provided (download from private bucket via service role)
  let signatureImage = null;
  if (signatureImageUrl && agreement.signature_type === 'electronic_signature') {
    try {
      const sigUrl: string = signatureImageUrl;
      // signature_image_url may be either a full URL (public/signed) or a raw storage path
      // like "signatures/signature_<id>_<ts>.png" inside the signed-agreements bucket.
      const m = sigUrl.match(/\/object\/(?:public|sign)\/signed-agreements\/([^?]+)/);
      const sigPath = m
        ? decodeURIComponent(m[1])
        : (sigUrl.startsWith('http') ? null : sigUrl.replace(/^\/+/, ''));
      const supabaseUrl2 = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey2 = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminLocal = (await import("https://esm.sh/@supabase/supabase-js@2.38.4")).createClient(
        supabaseUrl2, supabaseServiceKey2, { auth: { autoRefreshToken: false, persistSession: false } }
      );
      let sigBytes: ArrayBuffer | null = null;
      if (sigPath) {
        console.log('[Signed PDF] Downloading signature image from storage:', sigPath);
        const { data: blob, error: dlErr } = await adminLocal.storage.from('signed-agreements').download(sigPath);
        if (!dlErr && blob) {
          sigBytes = await blob.arrayBuffer();
        } else if (dlErr) {
          console.warn('[Signed PDF] signed-agreements download failed, trying signatures bucket:', dlErr.message);
          const { data: blob2, error: dlErr2 } = await adminLocal.storage.from('signatures').download(sigPath.replace(/^signatures\//, ''));
          if (!dlErr2 && blob2) sigBytes = await blob2.arrayBuffer();
          else console.error('[Signed PDF] signatures bucket download also failed:', dlErr2?.message);
        }
      }
      if (!sigBytes && sigUrl.startsWith('http')) {
        // Fallback: try direct fetch (works while bucket public)
        const r = await fetch(sigUrl);
        if (r.ok) sigBytes = await r.arrayBuffer();
      }

      if (sigBytes) {
        signatureImage = await pdfDoc.embedPng(new Uint8Array(sigBytes));
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
  if (signatureImage && agreement.signature_type === 'electronic_signature') {
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
