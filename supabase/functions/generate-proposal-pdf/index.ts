import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

// Create Supabase admin client with service role key
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://uyjryuopuqgmsvayiccl.supabase.co"
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

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

  // Official Crunch Carbon corporate colors
  const crunchYellow = rgb(1, 0.804, 0.012); // #FFCD03
  const crunchCharcoal = rgb(0.137, 0.122, 0.125); // #231F20
  
  const colors = {
    text: crunchCharcoal,
    muted: rgb(0.40, 0.40, 0.40),
    light: rgb(0.70, 0.70, 0.70),
    border: rgb(0.85, 0.85, 0.85),
    yellow: crunchYellow,
    charcoal: crunchCharcoal,
    white: rgb(1, 1, 1),
  };

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
  cover.drawRectangle({ x: 0, y: 0, width: coverWidth, height: coverHeight, color: crunchYellow });

  // Top heading block
  const titleSize = 48;
  const topMargin = mm(20);
  const leftMargin = mm(20);
  const firstLineY = coverHeight - topMargin - titleSize;
  cover.drawText('Crunching Carbon', { x: leftMargin, y: firstLineY, size: titleSize, font: bold, color: crunchCharcoal });
  const secondLineY = firstLineY - titleSize - mm(4);
  cover.drawText(`for ${clientName}`, { x: leftMargin, y: secondLineY, size: titleSize, font: bold, color: crunchCharcoal });

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
    cover.drawText(placeholder, { x: (coverWidth - textWidth) / 2, y: mm(40), size: placeholderSize, font: bold, color: crunchCharcoal });
  }

  // Bottom-right revision label
  const revision = Math.max(0, (proposal.pdf_version || 1) - 1);
  const revisionWord = numberToWords(revision).toUpperCase();
  const revisionText = `Revision ${revisionWord}`;
  const revisionSize = 48;
  const revisionTextWidth = bold.widthOfTextAtSize(revisionText, revisionSize);
  cover.drawText(revisionText, { x: coverWidth - mm(20) - revisionTextWidth, y: mm(20), size: revisionSize, font: bold, color: crunchCharcoal });

  // PAGE 2: About / Benefits / Process (Yellow Background)
  const page2 = addPage();
  
  // Draw full-page yellow background (#FFCD03)
  page2.drawRectangle({
    x: 0,
    y: 0,
    width: page2.getSize().width,
    height: page2.getSize().height,
    color: crunchYellow,
  });

  const p2x = mm(20);
  let y = page2.getSize().height - mm(25);

  // Helper function for section headings (Charcoal, Helvetica Bold, size 16)
  const drawSectionHeading = (page: any, text: string, x: number, y: number) => {
    page.drawText(text, { x, y, size: 16, font: bold, color: crunchCharcoal });
  };

  // Helper function for section content (Charcoal, Helvetica, size 12)
  const drawSectionContent = (page: any, text: string, x: number, y: number, maxWidth: number) => {
    const lines = wrapText(text, maxWidth, 12, font);
    let currentY = y;
    for (const line of lines) {
      page.drawText(line, { x, y: currentY, size: 12, font, color: crunchCharcoal });
      currentY -= mm(5.5);
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

  const benefitsText = `Join Crunch Carbon and transform your solar energy into verified carbon credits earning real rewards while helping build a cleaner planet.

Get Paid for Impact: We handle the entire carbon credit process, from verification to sale and you earn from every ton reduced.

Zero Cost, Zero Risk: Joining is completely free, with no hidden fees or financial exposure.

Support a Sustainable Future: Your participation directly drives renewable energy growth and carbon reduction across Africa.

Do good. Get rewarded. Join Crunch Carbon.`;
  
  y = drawSectionContent(page2, benefitsText, p2x, y, page2.getSize().width - p2x * 2);

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

  // Add 5-step circular flow diagram at bottom of page 2
  const contentWidth = page2.getSize().width - p2x * 2;
  const availableBottomSpace = y - mm(20); // Space from current y to page bottom margin
  
  // Flow diagram settings - matching reference image
  const flowSteps = [
    'Review Proposal\n(if happy proceed\nto step 2)',
    'Agree to\nCession\nAgreement',
    'Project\nOnboarding',
    'Crunch Carbon\nprepares for\nannual Audit',
    'Reward'
  ];
  
  // Gold/yellow color for icons and arrows
  const goldColor = rgb(0.831, 0.686, 0.216); // #D4AF37
  
  const circleRadius = mm(10);
  const circleDiameter = circleRadius * 2;
  const circleSpacing = mm(6);
  const arrowLength = mm(8);
  const labelHeight = mm(16); // Increased for multi-line labels
  const totalDiagramHeight = circleDiameter + labelHeight;
  
  // Calculate total width and ensure it fits within content width
  const totalDiagramWidth = (circleDiameter * flowSteps.length) + (arrowLength * (flowSteps.length - 1)) + (circleSpacing * (flowSteps.length - 1) * 2);
  const diagramStartX = p2x + (contentWidth - totalDiagramWidth) / 2;
  
  // Center vertically in available bottom space
  const diagramCenterY = mm(20) + availableBottomSpace / 2;
  const circleY = diagramCenterY + labelHeight / 2;
  
  // Draw each step circle with gold/yellow geometric icons
  for (let i = 0; i < flowSteps.length; i++) {
    const circleX = diagramStartX + circleRadius + i * (circleDiameter + arrowLength + circleSpacing * 2);
    
    // Draw white circle with subtle border
    page2.drawCircle({
      x: circleX,
      y: circleY,
      size: circleRadius,
      color: rgb(1, 1, 1), // white fill
      borderColor: rgb(0.9, 0.9, 0.9),
      borderWidth: 1.5,
    });
    
    // Draw gold/yellow geometric icon in center of circle based on step
    const iconSize = mm(4.5);
    if (i === 0) {
      // Step 1: Document with magnifying glass
      // Document (rectangle)
      page2.drawRectangle({
        x: circleX - iconSize * 0.5,
        y: circleY - iconSize * 0.6,
        width: iconSize * 0.8,
        height: iconSize * 1.1,
        borderColor: goldColor,
        borderWidth: 1.8,
      });
      // Lines inside document
      page2.drawLine({
        start: { x: circleX - iconSize * 0.3, y: circleY + iconSize * 0.2 },
        end: { x: circleX + iconSize * 0.1, y: circleY + iconSize * 0.2 },
        thickness: 1.2,
        color: goldColor,
      });
      page2.drawLine({
        start: { x: circleX - iconSize * 0.3, y: circleY - iconSize * 0.1 },
        end: { x: circleX + iconSize * 0.1, y: circleY - iconSize * 0.1 },
        thickness: 1.2,
        color: goldColor,
      });
      // Magnifying glass (small circle)
      page2.drawCircle({
        x: circleX + iconSize * 0.4,
        y: circleY - iconSize * 0.4,
        size: iconSize * 0.35,
        borderColor: goldColor,
        borderWidth: 1.5,
      });
    } else if (i === 1) {
      // Step 2: Handshake (geometric representation)
      // Two rectangles meeting at angle
      page2.drawRectangle({
        x: circleX - iconSize * 0.7,
        y: circleY - iconSize * 0.3,
        width: iconSize * 0.6,
        height: iconSize * 0.8,
        borderColor: goldColor,
        borderWidth: 1.8,
      });
      page2.drawRectangle({
        x: circleX + iconSize * 0.1,
        y: circleY - iconSize * 0.3,
        width: iconSize * 0.6,
        height: iconSize * 0.8,
        borderColor: goldColor,
        borderWidth: 1.8,
      });
      // Connection line
      page2.drawLine({
        start: { x: circleX - iconSize * 0.4, y: circleY },
        end: { x: circleX + iconSize * 0.4, y: circleY },
        thickness: 2,
        color: goldColor,
      });
    } else if (i === 2) {
      // Step 3: Rocket
      // Triangle pointing up
      page2.drawLine({
        start: { x: circleX, y: circleY + iconSize },
        end: { x: circleX - iconSize * 0.5, y: circleY - iconSize * 0.3 },
        thickness: 2,
        color: goldColor,
      });
      page2.drawLine({
        start: { x: circleX, y: circleY + iconSize },
        end: { x: circleX + iconSize * 0.5, y: circleY - iconSize * 0.3 },
        thickness: 2,
        color: goldColor,
      });
      page2.drawLine({
        start: { x: circleX - iconSize * 0.5, y: circleY - iconSize * 0.3 },
        end: { x: circleX + iconSize * 0.5, y: circleY - iconSize * 0.3 },
        thickness: 2,
        color: goldColor,
      });
      // Flames (small lines at bottom)
      page2.drawLine({
        start: { x: circleX - iconSize * 0.3, y: circleY - iconSize * 0.3 },
        end: { x: circleX - iconSize * 0.5, y: circleY - iconSize * 0.8 },
        thickness: 1.5,
        color: goldColor,
      });
      page2.drawLine({
        start: { x: circleX, y: circleY - iconSize * 0.3 },
        end: { x: circleX, y: circleY - iconSize * 0.9 },
        thickness: 1.5,
        color: goldColor,
      });
      page2.drawLine({
        start: { x: circleX + iconSize * 0.3, y: circleY - iconSize * 0.3 },
        end: { x: circleX + iconSize * 0.5, y: circleY - iconSize * 0.8 },
        thickness: 1.5,
        color: goldColor,
      });
    } else if (i === 3) {
      // Step 4: Calendar grid with magnifying glass
      // Calendar grid
      page2.drawRectangle({
        x: circleX - iconSize * 0.6,
        y: circleY - iconSize * 0.6,
        width: iconSize * 0.9,
        height: iconSize * 1.0,
        borderColor: goldColor,
        borderWidth: 1.8,
      });
      // Grid lines
      page2.drawLine({
        start: { x: circleX - iconSize * 0.6, y: circleY + iconSize * 0.1 },
        end: { x: circleX + iconSize * 0.3, y: circleY + iconSize * 0.1 },
        thickness: 1.2,
        color: goldColor,
      });
      page2.drawLine({
        start: { x: circleX - iconSize * 0.3, y: circleY + iconSize * 0.4 },
        end: { x: circleX - iconSize * 0.3, y: circleY - iconSize * 0.6 },
        thickness: 1.2,
        color: goldColor,
      });
      // Magnifying glass
      page2.drawCircle({
        x: circleX + iconSize * 0.4,
        y: circleY - iconSize * 0.4,
        size: iconSize * 0.35,
        borderColor: goldColor,
        borderWidth: 1.5,
      });
    } else if (i === 4) {
      // Step 5: Treasure chest
      // Chest body (rectangle)
      page2.drawRectangle({
        x: circleX - iconSize * 0.6,
        y: circleY - iconSize * 0.7,
        width: iconSize * 1.2,
        height: iconSize * 0.8,
        borderColor: goldColor,
        borderWidth: 1.8,
      });
      // Chest lid (arc approximation using lines)
      page2.drawLine({
        start: { x: circleX - iconSize * 0.6, y: circleY + iconSize * 0.1 },
        end: { x: circleX - iconSize * 0.3, y: circleY + iconSize * 0.4 },
        thickness: 1.8,
        color: goldColor,
      });
      page2.drawLine({
        start: { x: circleX - iconSize * 0.3, y: circleY + iconSize * 0.4 },
        end: { x: circleX, y: circleY + iconSize * 0.5 },
        thickness: 1.8,
        color: goldColor,
      });
      page2.drawLine({
        start: { x: circleX, y: circleY + iconSize * 0.5 },
        end: { x: circleX + iconSize * 0.3, y: circleY + iconSize * 0.4 },
        thickness: 1.8,
        color: goldColor,
      });
      page2.drawLine({
        start: { x: circleX + iconSize * 0.3, y: circleY + iconSize * 0.4 },
        end: { x: circleX + iconSize * 0.6, y: circleY + iconSize * 0.1 },
        thickness: 1.8,
        color: goldColor,
      });
      // Sparkles (small stars around chest)
      const sparkleSize = mm(1);
      page2.drawLine({
        start: { x: circleX - iconSize * 0.9, y: circleY + iconSize * 0.3 },
        end: { x: circleX - iconSize * 0.9, y: circleY + iconSize * 0.5 },
        thickness: 1,
        color: goldColor,
      });
      page2.drawLine({
        start: { x: circleX - iconSize, y: circleY + iconSize * 0.4 },
        end: { x: circleX - iconSize * 0.8, y: circleY + iconSize * 0.4 },
        thickness: 1,
        color: goldColor,
      });
    }
    
    // Draw label below circle (centered, multi-line)
    const labelLines = flowSteps[i].split('\n');
    const labelLineHeight = mm(3.5);
    let labelY = circleY - circleRadius - mm(5);
    
    for (const line of labelLines) {
      const lineWidth = font.widthOfTextAtSize(line, 8);
      page2.drawText(line, {
        x: circleX - lineWidth / 2,
        y: labelY,
        size: 8,
        font,
        color: crunchCharcoal,
      });
      labelY -= labelLineHeight;
    }
    
    // Draw gold/yellow arrow to next step (except for last step)
    if (i < flowSteps.length - 1) {
      const arrowStartX = circleX + circleRadius + mm(2);
      const arrowEndX = arrowStartX + arrowLength + circleSpacing * 2 - mm(4);
      
      // Arrow line
      page2.drawLine({
        start: { x: arrowStartX, y: circleY },
        end: { x: arrowEndX, y: circleY },
        thickness: 2.5,
        color: goldColor,
      });
      
      // Arrow head
      const arrowHeadSize = mm(2.5);
      page2.drawLine({
        start: { x: arrowEndX, y: circleY },
        end: { x: arrowEndX - arrowHeadSize, y: circleY + arrowHeadSize },
        thickness: 2.5,
        color: goldColor,
      });
      page2.drawLine({
        start: { x: arrowEndX, y: circleY },
        end: { x: arrowEndX - arrowHeadSize, y: circleY - arrowHeadSize },
        thickness: 2.5,
        color: goldColor,
      });
    }
  }

  drawPageNumber(page2, 2, 5);

  // PAGE 3: Project Schedule (Yellow Background)
  const page3 = addPage();
  
  // Draw full-page yellow background (#FFCD03)
  page3.drawRectangle({
    x: 0,
    y: 0,
    width: page3.getSize().width,
    height: page3.getSize().height,
    color: crunchYellow,
  });

  const p3x = mm(20);
  y = page3.getSize().height - mm(25);

  // Heading: "Project Schedule" in charcoal
  page3.drawText('Project Schedule', { x: p3x, y, size: 18, font: bold, color: crunchCharcoal });
  y -= mm(12);

  // Description paragraph in black
  const descriptionText = 'The project schedule is based on information as provided by the Client or Client\'s Agent or Solar Installer. The proposal, based on the project schedule, can be amended as required and will be annexed to the Cession Agreement. Note that it may impact the eligibility and structure of the agreement.';
  const descriptionLines = wrapText(descriptionText, page3.getSize().width - p3x * 2, 11, font);
  for (const line of descriptionLines) {
    page3.drawText(line, { x: p3x, y, size: 11, font, color: crunchCharcoal });
    y -= mm(5.5);
  }

  y -= mm(4);

  // Draw table with yellow background and black borders - 3 columns design
  const tableX = p3x;
  const tableY = y - mm(5);
  const tableWidth = page3.getSize().width - p3x * 2;
  
  // Calculate available height for table (to bottom margin)
  const availableHeight = tableY - mm(30);
  const rowHeight = mm(9);
  const maxRows = Math.floor(availableHeight / rowHeight) - 1; // -1 for header and totals
  const tableHeight = maxRows * rowHeight + rowHeight; // +1 for header row
  
  // Draw outer black border
  page3.drawRectangle({
    x: tableX,
    y: tableY - tableHeight,
    width: tableWidth,
    height: tableHeight,
    color: crunchYellow, // yellow background matching page
    borderColor: crunchCharcoal, // charcoal border
    borderWidth: 1.5,
  });

  // Extract project data
  const projects = [{
    address: anyProposal.project_info?.address || anyProposal.content?.projectInfo?.address || 'To be confirmed',
    commissionDate: anyProposal.project_info?.commission_date || anyProposal.content?.projectInfo?.commissionDate || 'To be confirmed',
    sizeKwp: anyProposal.system_size_kwp || 0
  }];

  // Calculate column widths and positions
  const col1Width = tableWidth * 0.50; // Project Address
  const col2Width = tableWidth * 0.25; // Commissioning Date
  const col3Width = tableWidth * 0.25; // Project Size kWp
  
  const tableLeftMargin = tableX + mm(4);
  const col1X = tableLeftMargin;
  const col2X = col1X + col1Width;
  const col3X = col2X + col2Width;
  
  // Calculate column centers for text alignment
  const col1Center = col1X + (col1Width / 2);
  const col2Center = col2X + (col2Width / 2);
  const col3Center = col3X + (col3Width / 2);
  
  const verticalCenterOffset = mm(2.5);

  // Draw header row
  const headerY = tableY - rowHeight;
  const header1Text = 'Project Address';
  const header1Width = bold.widthOfTextAtSize(header1Text, 10);
  page3.drawText(header1Text, { 
    x: col1Center - (header1Width / 2), 
    y: headerY + verticalCenterOffset, 
    size: 10, 
    font: bold, 
    color: crunchCharcoal
  });
  
  const header2Text = 'Commissioning Date';
  const header2Width = bold.widthOfTextAtSize(header2Text, 10);
  page3.drawText(header2Text, { 
    x: col2Center - (header2Width / 2), 
    y: headerY + verticalCenterOffset, 
    size: 10, 
    font: bold, 
    color: crunchCharcoal
  });
  
  const header3Text = 'Project Size (kWp)';
  const header3Width = bold.widthOfTextAtSize(header3Text, 10);
  page3.drawText(header3Text, { 
    x: col3Center - (header3Width / 2), 
    y: headerY + verticalCenterOffset, 
    size: 10, 
    font: bold, 
    color: crunchCharcoal
  });
  
  // Draw horizontal line after header
  page3.drawRectangle({
    x: tableX,
    y: headerY,
    width: tableWidth,
    height: 1,
    color: crunchCharcoal,
  });

  // Draw project data rows
  let currentRow = 1;
  for (const project of projects) {
    const rowY = tableY - (currentRow + 1) * rowHeight;
    
    // Check if address needs wrapping
    const addressWidth = col1Width - mm(8);
    const addressLines = wrapText(project.address, addressWidth, 10, font);
    const needsDoubleHeight = addressLines.length > 1;
    
    if (needsDoubleHeight) {
      // Draw address on multiple lines - centered
      let addressY = rowY + verticalCenterOffset + mm(4);
      for (const line of addressLines) {
        const lineWidth = font.widthOfTextAtSize(line, 10);
        page3.drawText(line, { 
          x: col1Center - (lineWidth / 2), 
          y: addressY, 
          size: 10, 
          font, 
          color: crunchCharcoal
        });
        addressY -= mm(4.5);
      }
    } else {
      const addressWidth = font.widthOfTextAtSize(project.address, 10);
      page3.drawText(project.address, { 
        x: col1Center - (addressWidth / 2), 
        y: rowY + verticalCenterOffset, 
        size: 10, 
        font, 
        color: crunchCharcoal
      });
    }
    
    const dateText = String(project.commissionDate);
    const dateWidth = font.widthOfTextAtSize(dateText, 10);
    page3.drawText(dateText, { 
      x: col2Center - (dateWidth / 2), 
      y: rowY + verticalCenterOffset, 
      size: 10, 
      font, 
      color: crunchCharcoal
    });
    
    const kwpText = fmtNum(project.sizeKwp, ' kWp');
    const kwpWidth = font.widthOfTextAtSize(kwpText, 10);
    page3.drawText(kwpText, { 
      x: col3Center - (kwpWidth / 2), 
      y: rowY + verticalCenterOffset, 
      size: 10, 
      font, 
      color: crunchCharcoal
    });
    
    currentRow++;
  }

  // Draw empty rows to fill the table
  for (let i = currentRow; i < maxRows - 1; i++) {
    const rowY = tableY - (i + 1) * rowHeight;
    // Draw horizontal line
    page3.drawRectangle({
      x: tableX,
      y: rowY,
    width: tableWidth,
    height: 1,
    color: crunchCharcoal,
    });
  }

  // Draw totals row at the bottom
  const totalKwp = projects.reduce((sum, p) => sum + (p.sizeKwp || 0), 0);
  const totalsY = tableY - tableHeight + rowHeight;
  
  // Draw thicker line above totals
  page3.drawRectangle({
    x: tableX,
    y: totalsY + rowHeight,
    width: tableWidth,
    height: 1.5,
    color: crunchCharcoal,
  });
  
  const totalText = 'TOTAL';
  const totalTextWidth = bold.widthOfTextAtSize(totalText, 10);
  page3.drawText(totalText, { 
    x: col1Center - (totalTextWidth / 2), 
    y: totalsY + verticalCenterOffset, 
    size: 10, 
    font: bold, 
    color: crunchCharcoal
  });
  
  const totalKwpText = fmtNum(totalKwp, ' kWp');
  const totalKwpWidth = bold.widthOfTextAtSize(totalKwpText, 10);
  page3.drawText(totalKwpText, { 
    x: col3Center - (totalKwpWidth / 2), 
    y: totalsY + verticalCenterOffset, 
    size: 10, 
    font: bold, 
    color: crunchCharcoal
  });

  // Draw vertical dividers between columns
  page3.drawRectangle({
    x: col2X,
    y: tableY - tableHeight,
    width: 1,
    height: tableHeight,
    color: crunchCharcoal,
  });
  page3.drawRectangle({
    x: col3X,
    y: tableY - tableHeight,
    width: 1,
    height: tableHeight,
    color: crunchCharcoal,
  });

  drawPageNumber(page3, 3, 5);

  // PAGE 4: Revenue Share Summary
  const page4 = addPage();
  // Add yellow background
  page4.drawRectangle({
    x: 0,
    y: 0,
    width: page4.getSize().width,
    height: page4.getSize().height,
    color: crunchYellow,
  });
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
  // Add yellow background
  page5.drawRectangle({
    x: 0,
    y: 0,
    width: page5.getSize().width,
    height: page5.getSize().height,
    color: crunchYellow,
  });
  const p5x = mm(20);
  y = page5.getSize().height - mm(25);

  drawHeading(page5, 'Acceptance', p5x, y);
  y -= mm(12);
  y = drawParagraph(page5, 'By signing below, the Client acknowledges the indicative terms herein and agrees to proceed to contracting subject to final due diligence and mutually agreed terms.', p5x, y, page5.getSize().width - p5x * 2);

  y -= mm(12);
  // Signature lines
  page5.drawText('Client Signature:', { x: p5x, y, size: 10, font: bold, color: crunchCharcoal });
  drawDivider(page5, p5x + mm(35), y + mm(2), mm(90));
  y -= mm(10);
  page5.drawText('Name:', { x: p5x, y, size: 10, font: bold, color: crunchCharcoal });
  drawDivider(page5, p5x + mm(18), y + mm(2), mm(70));
  y -= mm(10);
  page5.drawText('Date:', { x: p5x, y, size: 10, font: bold, color: crunchCharcoal });
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
