import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { supabaseAdmin } from "../_shared/supabase-admin.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProposalPdfRequest {
  proposalId: string
  forceRegenerate?: boolean
}

interface ProposalData {
  id: string
  title: string
  status: string
  content: any
  agent_id: string
  client_reference_id: string
  system_size_kwp: number
  carbon_credits: number
  client_share_percentage: number
  agent_commission_percentage: number
  pdf_version: number
  created_at: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { proposalId, forceRegenerate = false }: ProposalPdfRequest = await req.json()

    console.log(`Generating PDF for proposal: ${proposalId}, force regenerate: ${forceRegenerate}`)

    // Fetch proposal data with client information
    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from('proposals')
      .select(`
        *,
        agent:profiles!proposals_agent_id_fkey(first_name, last_name, company_name),
        client:clients!proposals_client_reference_id_fkey(first_name, last_name, email, company_name)
      `)
      .eq('id', proposalId)
      .single()

    if (proposalError || !proposal) {
      console.error('Error fetching proposal:', proposalError)
      return new Response(
        JSON.stringify({ error: 'Proposal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if PDF exists and is current (unless force regenerating)
    if (!forceRegenerate && proposal.pdf_url && proposal.pdf_generated_at) {
      const pdfAge = new Date().getTime() - new Date(proposal.pdf_generated_at).getTime()
      const proposalAge = new Date().getTime() - new Date(proposal.updated_at || proposal.created_at).getTime()
      
      // If PDF is newer than proposal updates, return existing URL
      if (pdfAge < proposalAge) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            pdf_url: proposal.pdf_url,
            cached: true 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Generate PDF content
    const pdfContent = await generatePdfContent(proposal as ProposalData)
    
    // Upload PDF to storage
    const fileName = `proposal-${proposalId}-v${proposal.pdf_version || 1}.pdf`
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('proposal-pdfs')
      .upload(fileName, pdfContent, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError)
      return new Response(
        JSON.stringify({ error: 'Failed to upload PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('proposal-pdfs')
      .getPublicUrl(fileName)

    // Update proposal with PDF metadata
    const { error: updateError } = await supabaseAdmin
      .from('proposals')
      .update({
        pdf_url: publicUrl,
        pdf_generated_at: new Date().toISOString(),
        pdf_version: (proposal.pdf_version || 1) + 1
      })
      .eq('id', proposalId)

    if (updateError) {
      console.error('Error updating proposal with PDF metadata:', updateError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        pdf_url: publicUrl,
        generated: true 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate-proposal-pdf function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Generate a real PDF using pdf-lib
async function generatePdfContent(proposal: ProposalData): Promise<Uint8Array> {
  // Dynamically import pdf-lib to avoid top-level imports
  const { PDFDocument, StandardFonts, rgb } = await import('https://esm.sh/pdf-lib@1.17.1');

  const pdfDoc = await PDFDocument.create();
  // A4 size in points: 595.28 x 841.89
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const marginX = 48;
  let cursorY = height - 64;

  const drawHeader = (text: string) => {
    page.drawText(text, {
      x: marginX,
      y: cursorY,
      size: 20,
      font: boldFont,
      color: rgb(0, 0, 0)
    });
    cursorY -= 28;
  };

  const drawLabelValue = (label: string, value: string) => {
    page.drawText(label, { x: marginX, y: cursorY, size: 11, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(value, { x: marginX + 160, y: cursorY, size: 11, font, color: rgb(0, 0, 0) });
    cursorY -= 18;
  };

  const drawDivider = () => {
    cursorY -= 6;
    page.drawRectangle({
      x: marginX,
      y: cursorY,
      width: width - marginX * 2,
      height: 0.5,
      color: rgb(0.85, 0.85, 0.85)
    });
    cursorY -= 16;
  };

  const fmt = (n: number | null | undefined, suffix = '') =>
    typeof n === 'number' ? `${Number(n.toFixed(2))}${suffix}` : '—';

  // Title
  drawHeader(proposal.title || 'Proposal');

  // Parties
  const agent: any = (proposal as any).agent || {};
  const client: any = (proposal as any).client || {};
  const agentName = `${agent.first_name ?? ''} ${agent.last_name ?? ''}`.trim() || agent.company_name || '—';
  const clientName = `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() || client.company_name || '—';

  drawLabelValue('Client', clientName);
  drawLabelValue('Client Email', client.email || '—');
  drawLabelValue('Agent', agentName);
  drawDivider();

  // Key Metrics
  drawHeader('Key Metrics');
  drawLabelValue('System Size', fmt((proposal as any).system_size_kwp, ' kWp'));
  drawLabelValue('Carbon Credits', fmt((proposal as any).carbon_credits));
  drawLabelValue('Client Share', fmt((proposal as any).client_share_percentage, '%'));
  drawLabelValue('Agent Commission', fmt((proposal as any).agent_commission_percentage, '%'));
  drawDivider();

  // Details
  drawHeader('Details');
  drawLabelValue('Proposal ID', proposal.id);
  drawLabelValue('Status', proposal.status);
  drawLabelValue('PDF Version', String(proposal.pdf_version ?? 1));
  drawLabelValue('Created At', new Date(proposal.created_at).toLocaleString());
  drawDivider();

  // Footer
  const footer = `Generated by Supabase Edge Function at ${new Date().toISOString()}`;
  page.drawText(footer, { x: marginX, y: 24, size: 9, font, color: rgb(0.4, 0.4, 0.4) });

  // Return real PDF bytes
  return await pdfDoc.save();
}