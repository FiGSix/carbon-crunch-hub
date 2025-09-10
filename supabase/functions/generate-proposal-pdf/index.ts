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
        agent:profiles!proposals_agent_id_fkey(first_name, last_name, company_name, company_logo_url, email),
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

// Generate a real PDF using pdf-lib styled to match 5-page template
async function generatePdfContent(proposal: ProposalData): Promise<Uint8Array> {
  const start = Date.now();
  // Dynamically import pdf-lib to avoid top-level imports
  const { PDFDocument, StandardFonts, rgb } = await import('https://esm.sh/pdf-lib@1.17.1');

  const pdfDoc = await PDFDocument.create();
  const A4: [number, number] = [595.28, 841.89];

  // Fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Brand colors (approximate)
  const colors = {
    text: rgb(0.12, 0.12, 0.12),
    muted: rgb(0.40, 0.40, 0.40),
    light: rgb(0.70, 0.70, 0.70),
    border: rgb(0.85, 0.85, 0.85),
    yellow: rgb(1.0, 0.85, 0.20),
    charcoal: rgb(0.10, 0.12, 0.14),
    white: rgb(1, 1, 1),
  };
  const brandYellow = rgb(1, 0.8, 0.00784);

  // Logo sources: try public Storage bucket paths first, then agent-provided URL
  const STORAGE_PUBLIC_BASE = 'https://uyjryuopuqgmsvayiccl.supabase.co/storage/v1/object/public';
  const LOGO_CANDIDATE_URLS = [
    `${STORAGE_PUBLIC_BASE}/company-logos/branding/crunch-carbon-logo-new.png`,
    `${STORAGE_PUBLIC_BASE}/company-logos/crunch-carbon-logo-new.png`,
  ];

  // Safe accessors
  const anyProposal: any = proposal as any;
  const agent = anyProposal.agent || {};
  const client = anyProposal.client || {};
  const clientName = `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() || client.company_name || 'Client';
  const agentName = `${agent.first_name ?? ''} ${agent.last_name ?? ''}`.trim() || agent.company_name || 'Crunch Carbon';
  const agentEmail = agent.email || '';
  const logoUrl = agent.company_logo_url || null;

  // Helpers
  const mm = (n: number) => (n / 25.4) * 72; // convert mm to points

  const numberToWords = (num: number): string => {
    const ones = ['ZERO','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN','ELEVEN','TWELVE','THIRTEEN','FOURTEEN','FIFTEEN','SIXTEEN','SEVENTEEN','EIGHTEEN','NINETEEN'];
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
    if (num < 0) return ones[0];
    if (num < 20) return ones[num];
    if (num < 100) {
      const t = Math.floor(num / 10);
      const r = num % 10;
      return tens[t] + (r ? '-' + ones[r] : '');
    }
    if (num < 1000) {
      const h = Math.floor(num / 100);
      const r = num % 100;
      return ones[h] + ' HUNDRED' + (r ? ' ' + numberToWords(r) : '');
    }
    return String(num);
  };

  const addPage = () => {
    const page = pdfDoc.addPage(A4);
    return page;
  };

  const drawPageNumber = (page: any, idx: number, total: number) => {
    const { width } = page.getSize();
    const text = `Page ${idx} of ${total}`;
    page.drawText(text, {
      x: width - 120,
      y: mm(10),
      size: 9,
      font,
      color: colors.light,
    });
  };

  const wrapText = (text: string, maxWidth: number, size: number, f = font) => {
    const usedFont = (f && typeof (f as any).widthOfTextAtSize === 'function') ? f : font;
    const words = (text || '').split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      const width = usedFont.widthOfTextAtSize(test, size);
      if (width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  const drawHeading = (page: any, text: string, x: number, y: number) => {
    page.drawText(text, { x, y, size: 18, font: bold, color: colors.charcoal });
  };

  const drawSubheading = (page: any, text: string, x: number, y: number) => {
    page.drawText(text, { x, y, size: 12, font: bold, color: colors.text });
  };

  const drawParagraph = (page: any, text: string, x: number, y: number, width: number, size = 10) => {
    const lines = wrapText(text, width, size, font);
    let cursorY = y;
    for (const line of lines) {
      page.drawText(line, { x, y: cursorY, size, font, color: colors.text });
      cursorY -= size + 3;
    }
    return cursorY;
  };

  const drawKeyValue = (page: any, label: string, value: string, x: number, y: number) => {
    page.drawText(label, { x, y, size: 10, font: bold, color: colors.muted });
    page.drawText(value, { x: x + 120, y, size: 11, font, color: colors.text });
  };

  const drawDivider = (page: any, x: number, y: number, w: number) => {
    page.drawRectangle({ x, y, width: w, height: 0.5, color: colors.border });
  };

  const fmtNum = (n: number | null | undefined, suffix = '') =>
    typeof n === 'number' ? `${Number(n.toFixed(2)).toLocaleString()}${suffix}` : '—';

  // Try embedding logo if provided
  const tryEmbedLogo = async (url?: string) => {
    if (!url) return null;
    try {
      console.log('[PDF] Attempting to fetch logo', { url });
      const res = await fetch(url);
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok) {
        console.warn('[PDF] Logo fetch failed', { url, status: res.status, statusText: res.statusText });
        return null;
      }
      const buf = new Uint8Array(await res.arrayBuffer());
      try {
        const img = await pdfDoc.embedPng(buf);
        console.log('[PDF] Embedded PNG logo successfully', { url, contentType });
        return img;
      } catch (e1) {
        try {
          const img = await pdfDoc.embedJpg(buf);
          console.log('[PDF] Embedded JPG logo successfully', { url, contentType });
          return img;
        } catch (e2) {
          console.warn('[PDF] Failed to embed logo as PNG or JPG', { url, contentType });
          return null;
        }
      }
    } catch (e) {
      console.error('[PDF] Error fetching/embedding logo', { url, error: String(e) });
      return null;
    }
  };

  let logoImage: any = null;
  for (const candidate of [...LOGO_CANDIDATE_URLS, logoUrl]) {
    const img = await tryEmbedLogo(candidate as string | undefined);
    if (img) {
      logoImage = img;
      console.log('[PDF] Using logo from', candidate);
      break;
    }
  }

  // PAGE 1: Cover
  const cover = addPage();
  const coverPaddingX = mm(20);
  const coverWidth = cover.getSize().width;
  const coverHeight = cover.getSize().height;

  // Full-page background
  cover.drawRectangle({ x: 0, y: 0, width: coverWidth, height: coverHeight, color: brandYellow });

  // Top heading block
  const titleSize = 48;
  const topMargin = mm(20);
  const leftMargin = mm(20);
  const firstLineY = coverHeight - topMargin - titleSize;
  cover.drawText('Crunching Carbon', { x: leftMargin, y: firstLineY, size: titleSize, font: bold, color: rgb(0, 0, 0) });
  const secondLineY = firstLineY - titleSize - mm(4);
  cover.drawText(`for ${clientName}`, { x: leftMargin, y: secondLineY, size: titleSize, font: bold, color: colors.white });

  // Bottom-centered Crunch Carbon logo
  if (logoImage) {
    const maxLogoWidth = mm(90); // slightly larger for hero logo clarity
    const lw = Math.min(maxLogoWidth, logoImage.width);
    const lh = (logoImage.height / logoImage.width) * lw;
    const logoX = (coverWidth - lw) / 2;
    const logoY = mm(36); // nudge a bit closer to bottom center
    cover.drawImage(logoImage, { x: logoX, y: logoY, width: lw, height: lh });
  } else {
    const placeholder = 'Crunch Carbon';
    const placeholderSize = 24;
    const textWidth = bold.widthOfTextAtSize(placeholder, placeholderSize);
    cover.drawText(placeholder, { x: (coverWidth - textWidth) / 2, y: mm(40), size: placeholderSize, font: bold, color: rgb(0, 0, 0) });
  }

  // Bottom-right revision label
  const revision = Math.max(0, (proposal.pdf_version || 1) - 1);
  const revisionWord = numberToWords(revision).toUpperCase();
  const revisionText = `Revision ${revisionWord}`;
  const revisionSize = 48;
  const revisionTextWidth = bold.widthOfTextAtSize(revisionText, revisionSize);
  cover.drawText(revisionText, { x: coverWidth - mm(20) - revisionTextWidth, y: mm(20), size: revisionSize, font: bold, color: colors.white });

  // PAGE 2: About / Benefits / Process (Yellow Background)
  const page2 = addPage();
  
  // Draw full-page yellow background (#FFCC02)
  page2.drawRectangle({
    x: 0,
    y: 0,
    width: page2.getSize().width,
    height: page2.getSize().height,
    color: rgb(1, 0.8, 0.00784), // #FFCC02
  });

  const p2x = mm(20);
  let y = page2.getSize().height - mm(25);

  // Helper function for section headings (Black, Helvetica Bold, size 16)
  const drawSectionHeading = (page: any, text: string, x: number, y: number) => {
    page.drawText(text, { x, y, size: 16, font: bold, color: rgb(0, 0, 0) });
  };

  // Helper function for section content (Black, Helvetica, size 12)
  const drawSectionContent = (page: any, text: string, x: number, y: number, maxWidth: number) => {
    const lines = wrapText(text, maxWidth, 12, font);
    let currentY = y;
    for (const line of lines) {
      page.drawText(line, { x, y: currentY, size: 12, font, color: rgb(0, 0, 0) });
      currentY -= mm(4.5);
    }
    return currentY;
  };

  // ABOUT Section
  drawSectionHeading(page2, 'About', p2x, y);
  y -= mm(8);
  const aboutText = `Carbon credits are designed as a market-based mechanism to reduce greenhouse gas emissions. They allow companies to trade emission permits while giving businesses and individuals a unique opportunity to contribute to the global fight against climate change.

At Crunch Carbon, we manage the entire carbon credit generation process for you—from sign-up through to data collection, auditing, and verification of your solar energy usage. Together with our partners, we then sell these credits on your behalf and ensure that you, as the solar system owner, are rewarded once the credits are sold.`;
  y = drawSectionContent(page2, aboutText, p2x, y, page2.getSize().width - p2x * 2);

  y -= mm(8);

  // BENEFITS Section
  drawSectionHeading(page2, 'Benefits', p2x, y);
  y -= mm(8);

  const benefitItems = [
    { title: 'Reduce Your Carbon Footprint', text: 'by participating with Crunch Carbon, where your business contributes to significant carbon reduction efforts, promoting a greener planet and you get paid cash.' },
    { title: 'Sustainable Future', text: 'Support the transition to renewable energy and sustainable practices.' },
    { title: 'Get rewarded', text: 'After driving your carbon credit generation process for you, Crunch Carbon with our partners will then proceed to sell these carbon credits and reward the owners of these solar systems.' },
    { title: 'No Costs', text: 'Joining Crunch Carbon is completely free, with no hidden fees or costs involved.' },
    { title: 'Risk-Free', text: 'Users do not carry any financial risks; they only gain rewards.' }
  ];

  for (const benefit of benefitItems) {
    y = drawSectionContent(page2, `${benefit.title}\n${benefit.text}`, p2x, y, page2.getSize().width - p2x * 2);
    y -= mm(4);
  }

  y -= mm(4);

  // THE PROCESS Section
  drawSectionHeading(page2, 'The Process', p2x, y);
  y -= mm(8);
  const processText = 'No gimmicks, tricks or funnies. We handle all the complex paperwork and data audits, ensuring a seamless experience for our clients.';
  y = drawSectionContent(page2, processText, p2x, y, page2.getSize().width - p2x * 2);

  y -= mm(8);

  // THE T&C'S Section
  drawSectionHeading(page2, "The T&C's", p2x, y);
  y -= mm(8);
  const tcText = `Our Cession Agreement protects your rights as a solar system owner while allowing you to benefit from carbon credits with minimal effort and no cost. You remain the lawful owner of your system and only environmental benefits are ceded for credit generation. Crunch Carbon, with our partner CDSA, manages the full Carbon Credit process. From registration, audits, verification to sales and disbursement of cash. Crunch Carbon covers all related costs. You receive the revenue share from credits sold, paid annually in June/July being the norm. Your data is treated as confidential, and you may request process details at any time. If you decide for whatever reason the Cession Agreement may be cancelled by either party with 30 days' notice. Disputes are resolved through mediation and arbitration, and if unforeseen events prevent performance, either party may terminate without penalty.`;
  y = drawSectionContent(page2, tcText, p2x, y, page2.getSize().width - p2x * 2);

  // PAGE 3: Project Details & Schedule
  const page3 = addPage();
  const p3x = mm(20);
  y = page3.getSize().height - mm(25);

  drawHeading(page3, 'Project Details', p3x, y);
  y -= mm(10);
  drawKeyValue(page3, 'System Size', fmtNum(anyProposal.system_size_kwp, ' kWp'), p3x, y); y -= mm(7);
  drawKeyValue(page3, 'Carbon Credits', fmtNum(anyProposal.carbon_credits), p3x, y); y -= mm(7);
  drawKeyValue(page3, 'Client Share', fmtNum(anyProposal.client_share_percentage, '%'), p3x, y); y -= mm(7);
  drawKeyValue(page3, 'Agent Commission', fmtNum(anyProposal.agent_commission_percentage, '%'), p3x, y); y -= mm(10);
  drawDivider(page3, p3x, y, page3.getSize().width - p3x * 2); y -= mm(6);

  drawSubheading(page3, 'Indicative Schedule', p3x, y);
  y -= mm(8);
  const schedule: Array<{ milestone: string; timeline: string }> = anyProposal.content?.schedule ?? [
    { milestone: 'Qualification', timeline: 'Week 1' },
    { milestone: 'Contracting', timeline: 'Weeks 2-3' },
    { milestone: 'Onboarding', timeline: 'Weeks 3-4' },
    { milestone: 'Credit Issuance', timeline: 'Monthly/Quarterly' },
  ];
  // simple two-column table
  const col1 = p3x;
  const col2 = p3x + mm(100);
  const rowH = mm(8);
  page3.drawText('Milestone', { x: col1, y, size: 10, font: bold, color: colors.muted });
  page3.drawText('Timeline', { x: col2, y, size: 10, font: bold, color: colors.muted });
  y -= mm(5);
  for (const row of schedule) {
    page3.drawText(row.milestone, { x: col1, y, size: 10, font, color: colors.text });
    page3.drawText(row.timeline, { x: col2, y, size: 10, font, color: colors.text });
    y -= rowH;
    drawDivider(page3, p3x, y + mm(2), page3.getSize().width - p3x * 2);
  }

  drawPageNumber(page3, 3, 5);

  // PAGE 4: Revenue Share Summary
  const page4 = addPage();
  const p4x = mm(20);
  y = page4.getSize().height - mm(25);

  drawHeading(page4, 'Revenue Share Summary', p4x, y);
  y -= mm(10);

  const metrics = [
    ['Carbon Credits', fmtNum(anyProposal.carbon_credits)],
    ['Client Share %', fmtNum(anyProposal.client_share_percentage, '%')],
    ['Agent Commission %', fmtNum(anyProposal.agent_commission_percentage, '%')],
    ['System Size', fmtNum(anyProposal.system_size_kwp, ' kWp')],
  ];

  for (const [label, val] of metrics) {
    drawKeyValue(page4, label, val, p4x, y);
    y -= mm(7);
  }

  y -= mm(4);
  drawSubheading(page4, 'Terms (Summary)', p4x, y);
  y -= mm(8);
  const terms: string[] = anyProposal.content?.terms ?? [
    'Client receives the stated share of carbon credit revenue.',
    'Crunch Carbon manages verification and monetization.',
    'Settlement frequency to be agreed in the final contract.'
  ];
  for (const t of terms) {
    page4.drawText('•', { x: p4x, y, size: 10, font: bold, color: colors.text });
    y = drawParagraph(page4, t, p4x + mm(5), y, page4.getSize().width - p4x * 2 - mm(5));
    y -= mm(2);
  }

  drawPageNumber(page4, 4, 5);

  // PAGE 5: Acceptance & Contact
  const page5 = addPage();
  const p5x = mm(20);
  y = page5.getSize().height - mm(25);

  drawHeading(page5, 'Acceptance', p5x, y);
  y -= mm(12);
  y = drawParagraph(page5, 'By signing below, the Client acknowledges the indicative terms herein and agrees to proceed to contracting subject to final due diligence and mutually agreed terms.', p5x, y, page5.getSize().width - p5x * 2);

  y -= mm(12);
  // Signature lines
  page5.drawText('Client Signature:', { x: p5x, y, size: 10, font: bold, color: colors.muted });
  drawDivider(page5, p5x + mm(35), y + mm(2), mm(90));
  y -= mm(10);
  page5.drawText('Name:', { x: p5x, y, size: 10, font: bold, color: colors.muted });
  drawDivider(page5, p5x + mm(18), y + mm(2), mm(70));
  y -= mm(10);
  page5.drawText('Date:', { x: p5x, y, size: 10, font: bold, color: colors.muted });
  drawDivider(page5, p5x + mm(15), y + mm(2), mm(40));

  // Contact block
  const contactX = page5.getSize().width - mm(90);
  const contactY = mm(60);
  page5.drawRectangle({ x: contactX - mm(5), y: contactY - mm(5), width: mm(80), height: mm(40), color: colors.white, borderColor: colors.border, borderWidth: 1 });
  page5.drawText('Contact', { x: contactX, y: contactY + mm(30), size: 12, font: bold, color: colors.charcoal });
  page5.drawText(agentName, { x: contactX, y: contactY + mm(22), size: 10, font, color: colors.text });
  if (agentEmail) page5.drawText(agentEmail, { x: contactX, y: contactY + mm(14), size: 10, font, color: colors.text });
  page5.drawText(agent.company_name || 'Crunch Carbon', { x: contactX, y: contactY + mm(6), size: 10, font, color: colors.text });

  drawPageNumber(page5, 5, 5);

  const bytes = await pdfDoc.save();
  console.log(`PDF generated in ${Date.now() - start}ms, pages: ${pdfDoc.getPages().length}`);
  return bytes;
}
