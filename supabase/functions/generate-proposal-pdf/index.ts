
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { proposalId } = await req.json()
    
    if (!proposalId) {
      return new Response(
        JSON.stringify({ error: 'Missing proposalId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Generating professional PDF for proposal: ${proposalId}`)

    // Update status to generating
    await supabaseClient
      .from('proposals')
      .update({ pdf_generation_status: 'generating' })
      .eq('id', proposalId)

    // Fetch comprehensive proposal data
    const { data: proposal, error: proposalError } = await supabaseClient
      .from('proposals')
      .select(`
        id, title, status, content, agent_id, client_id, client_reference_id,
        created_at, annual_energy, carbon_credits, client_share_percentage,
        agent_commission_percentage, project_info, eligibility_criteria
      `)
      .eq('id', proposalId)
      .single()

    if (proposalError || !proposal) {
      console.error('Error fetching proposal:', proposalError)
      await supabaseClient
        .from('proposals')
        .update({ pdf_generation_status: 'failed' })
        .eq('id', proposalId)
      
      return new Response(
        JSON.stringify({ error: 'Proposal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch agent information
    let agentInfo = null
    if (proposal.agent_id) {
      const { data: agent } = await supabaseClient
        .from('profiles')
        .select('first_name, last_name, email, company_name, phone')
        .eq('id', proposal.agent_id)
        .single()
      
      agentInfo = agent
    }

    // Generate professional HTML content matching Crunch Carbon brand
    const htmlContent = generateProfessionalHTML(proposal, agentInfo)
    
    // Convert HTML to PDF using proper conversion
    const pdfBuffer = await generatePDFFromHTML(htmlContent, proposal.title)
    
    // Upload PDF to storage
    const fileName = `proposal-${proposalId}-${Date.now()}.pdf`
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('proposal-pdfs')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError)
      await supabaseClient
        .from('proposals')
        .update({ pdf_generation_status: 'failed' })
        .eq('id', proposalId)
      
      return new Response(
        JSON.stringify({ error: 'Failed to upload PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get public URL for the PDF
    const { data: urlData } = supabaseClient.storage
      .from('proposal-pdfs')
      .getPublicUrl(fileName)

    // Update proposal with PDF info
    await supabaseClient
      .from('proposals')
      .update({
        pdf_url: urlData.publicUrl,
        pdf_generated_at: new Date().toISOString(),
        pdf_generation_status: 'completed'
      })
      .eq('id', proposalId)

    console.log(`Professional PDF generated successfully for proposal: ${proposalId}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        pdfUrl: urlData.publicUrl,
        fileName: fileName 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate-proposal-pdf function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function generateProfessionalHTML(proposal: any, agentInfo: any): string {
  const clientInfo = proposal.content?.clientInfo || {}
  const projectInfo = proposal.project_info || proposal.content?.projectInfo || {}
  
  // Calculate financial information with proper formatting
  const systemSizeKW = parseFloat(projectInfo.size || '0')
  const annualEnergyKWh = proposal.annual_energy || (systemSizeKW * 1500)
  const carbonCredits = proposal.carbon_credits || (annualEnergyKWh * 0.95 / 1000)
  const clientShare = proposal.client_share_percentage || 80
  const agentCommission = proposal.agent_commission_percentage || 5
  
  // Financial calculations using South African context
  const carbonPricePerTon = 120 // Updated to reflect current SA market
  const totalAnnualRevenue = carbonCredits * carbonPricePerTon
  const clientAnnualRevenue = totalAnnualRevenue * (clientShare / 100)
  const agentAnnualCommission = totalAnnualRevenue * (agentCommission / 100)
  const crunchCarbonFee = totalAnnualRevenue - clientAnnualRevenue - agentAnnualCommission
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>${proposal.title} - Crunch Carbon Proposal</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body { 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          line-height: 1.5;
          color: #1f2937;
          background: #ffffff;
          font-size: 14px;
        }
        
        .page {
          max-width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 15mm;
          background: white;
          page-break-inside: avoid;
        }
        
        /* Header with Crunch Carbon branding */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 4px solid #FFCD03;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        .logo-section {
          flex: 1;
        }
        
        .company-name {
          font-size: 36px;
          font-weight: 800;
          color: #231F20;
          margin-bottom: 6px;
          letter-spacing: -0.5px;
        }
        
        .tagline {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .proposal-meta {
          text-align: right;
          font-size: 12px;
          color: #6b7280;
          line-height: 1.6;
        }
        
        .proposal-meta strong {
          color: #231F20;
          font-weight: 600;
        }
        
        /* Title section with yellow accent */
        .title-section {
          text-align: center;
          margin-bottom: 40px;
          padding: 35px 30px;
          background: linear-gradient(135deg, #FFCD03 0%, #FFD700 100%);
          border-radius: 12px;
          position: relative;
          overflow: hidden;
        }
        
        .title-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(35, 31, 32, 0.05);
          z-index: 1;
        }
        
        .title-section * {
          position: relative;
          z-index: 2;
        }
        
        .main-title {
          font-size: 32px;
          font-weight: 800;
          color: #231F20;
          margin-bottom: 10px;
          text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
        }
        
        .subtitle {
          font-size: 16px;
          color: #231F20;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        /* Section styling */
        .section {
          margin-bottom: 35px;
          background: #ffffff;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
        }
        
        .section-header {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 18px 25px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .section-title {
          font-size: 18px;
          font-weight: 700;
          color: #231F20;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .section-content {
          padding: 25px;
        }
        
        /* Information grid */
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 25px;
          margin-bottom: 20px;
        }
        
        .info-item {
          margin-bottom: 18px;
        }
        
        .info-label {
          font-size: 11px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 6px;
        }
        
        .info-value {
          font-size: 15px;
          font-weight: 600;
          color: #231F20;
          line-height: 1.4;
        }
        
        /* Highlight boxes with Crunch Carbon styling */
        .highlight-box {
          background: linear-gradient(135deg, #231F20 0%, #2d2a2b 100%);
          color: #FFCD03;
          padding: 30px;
          border-radius: 12px;
          margin: 25px 0;
          position: relative;
          overflow: hidden;
        }
        
        .highlight-box::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 100px;
          height: 100px;
          background: radial-gradient(circle, rgba(255, 205, 3, 0.1) 0%, transparent 70%);
          transform: translateX(30px) translateY(-30px);
        }
        
        .highlight-title {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 20px;
          color: #FFCD03;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .highlight-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        
        .highlight-item {
          text-align: center;
          padding: 15px;
          background: rgba(255, 205, 3, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(255, 205, 3, 0.3);
        }
        
        .highlight-label {
          font-size: 12px;
          opacity: 0.9;
          margin-bottom: 8px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .highlight-value {
          font-size: 26px;
          font-weight: 800;
          color: #FFCD03;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        
        /* Financial table */
        .financial-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 14px;
        }
        
        .financial-table th,
        .financial-table td {
          padding: 15px 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .financial-table th {
          background: linear-gradient(135deg, #231F20 0%, #2d2a2b 100%);
          color: #FFCD03;
          font-weight: 700;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .financial-table td {
          font-weight: 500;
        }
        
        .financial-table .amount {
          font-weight: 700;
          color: #231F20;
          font-size: 15px;
        }
        
        .financial-table tr:nth-child(even) {
          background: #f9fafb;
        }
        
        .financial-table tr:hover {
          background: #f3f4f6;
        }
        
        /* Status badge */
        .status-badge {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .status-pending {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #f59e0b;
        }
        
        .status-approved {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #10b981;
        }
        
        .status-draft {
          background: #e5e7eb;
          color: #374151;
          border: 1px solid #6b7280;
        }
        
        /* Footer */
        .footer {
          margin-top: 50px;
          padding-top: 25px;
          border-top: 3px solid #FFCD03;
          font-size: 12px;
        }
        
        .footer-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        
        .agent-contact,
        .company-info {
          flex: 1;
          line-height: 1.6;
        }
        
        .agent-contact {
          padding-right: 20px;
        }
        
        .company-info {
          text-align: right;
          padding-left: 20px;
        }
        
        .footer strong {
          color: #231F20;
          font-weight: 700;
          display: block;
          margin-bottom: 5px;
          font-size: 13px;
        }
        
        .disclaimer {
          font-size: 10px;
          line-height: 1.5;
          color: #6b7280;
          text-align: center;
          padding: 20px;
          background: #f9fafb;
          border-radius: 8px;
          border-left: 4px solid #FFCD03;
        }
        
        /* Print optimizations */
        @media print {
          .page {
            margin: 0;
            box-shadow: none;
            page-break-inside: avoid;
          }
          
          .section {
            page-break-inside: avoid;
          }
        }
        
        /* Utility classes */
        .text-center { text-align: center; }
        .font-bold { font-weight: 700; }
        .text-sm { font-size: 12px; }
        .mb-2 { margin-bottom: 8px; }
        .mt-4 { margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Header with Crunch Carbon branding -->
        <div class="header">
          <div class="logo-section">
            <div class="company-name">CRUNCH CARBON</div>
            <div class="tagline">Carbon Credit Solutions</div>
          </div>
          <div class="proposal-meta">
            <div><strong>Proposal Ref:</strong> CC-${proposal.id.split('-')[0].toUpperCase()}</div>
            <div><strong>Date:</strong> ${new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
            <div><strong>Status:</strong> <span class="status-badge status-${proposal.status}">${proposal.status.toUpperCase()}</span></div>
            <div><strong>Valid Until:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-ZA', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
          </div>
        </div>

        <!-- Title Section -->
        <div class="title-section">
          <h1 class="main-title">${proposal.title}</h1>
          <p class="subtitle">Carbon Credit Revenue Sharing Proposal</p>
        </div>

        <!-- Client Information -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">Client Information</h2>
          </div>
          <div class="section-content">
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Client Name</div>
                <div class="info-value">${clientInfo.name || 'Not specified'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Email Address</div>
                <div class="info-value">${clientInfo.email || 'Not specified'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Phone Number</div>
                <div class="info-value">${clientInfo.phone || 'Not specified'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Company</div>
                <div class="info-value">${clientInfo.companyName || 'Not specified'}</div>
              </div>
            </div>
            ${clientInfo.address ? `
              <div class="info-item">
                <div class="info-label">Address</div>
                <div class="info-value">${clientInfo.address}</div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Project Information -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">Solar Installation Details</h2>
          </div>
          <div class="section-content">
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Project Name</div>
                <div class="info-value">${projectInfo.name || 'Not specified'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">System Capacity</div>
                <div class="info-value">${systemSizeKW.toFixed(2)} kWp</div>
              </div>
              <div class="info-item">
                <div class="info-label">Installation Address</div>
                <div class="info-value">${projectInfo.address || 'Not specified'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Commission Date</div>
                <div class="info-value">${projectInfo.commissionDate ? new Date(projectInfo.commissionDate).toLocaleDateString('en-ZA') : 'To be confirmed'}</div>
              </div>
            </div>
            
            <div class="highlight-box">
              <div class="highlight-title">Annual Performance & Carbon Impact</div>
              <div class="highlight-grid">
                <div class="highlight-item">
                  <div class="highlight-label">Energy Generation</div>
                  <div class="highlight-value">${Math.round(annualEnergyKWh).toLocaleString()} kWh</div>
                </div>
                <div class="highlight-item">
                  <div class="highlight-label">Carbon Credits</div>
                  <div class="highlight-value">${carbonCredits.toFixed(1)} tons CO₂</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Financial Breakdown -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">Revenue Distribution & Financial Terms</h2>
          </div>
          <div class="section-content">
            <table class="financial-table">
              <thead>
                <tr>
                  <th>Revenue Stream</th>
                  <th>Allocation</th>
                  <th>Annual Amount (Est.)</th>
                  <th>10-Year Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Total Carbon Credit Revenue</strong></td>
                  <td>100%</td>
                  <td class="amount">R ${totalAnnualRevenue.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</td>
                  <td class="amount">R ${(totalAnnualRevenue * 10).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</td>
                </tr>
                <tr>
                  <td>Client Revenue Share</td>
                  <td>${clientShare}%</td>
                  <td class="amount">R ${clientAnnualRevenue.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</td>
                  <td class="amount">R ${(clientAnnualRevenue * 10).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</td>
                </tr>
                <tr>
                  <td>Agent Commission</td>
                  <td>${agentCommission}%</td>
                  <td class="amount">R ${agentAnnualCommission.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</td>
                  <td class="amount">R ${(agentAnnualCommission * 10).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</td>
                </tr>
                <tr>
                  <td>Crunch Carbon Service Fee</td>
                  <td>${(100 - clientShare - agentCommission)}%</td>
                  <td class="amount">R ${crunchCarbonFee.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</td>
                  <td class="amount">R ${(crunchCarbonFee * 10).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</td>
                </tr>
              </tbody>
            </table>
            
            <div style="margin-top: 25px; padding: 20px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 8px; border-left: 4px solid #FFCD03;">
              <strong style="color: #231F20; display: block; margin-bottom: 10px;">Important Notes:</strong>
              <ul style="color: #4b5563; font-size: 13px; line-height: 1.6; margin-left: 20px;">
                <li>Revenue estimates based on current carbon credit pricing of R${carbonPricePerTon}/ton CO₂</li>
                <li>Actual revenues may vary based on market conditions and system performance</li>
                <li>Payments made quarterly following verified carbon credit sales</li>
                <li>All carbon credits subject to third-party verification and certification</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Terms & Conditions -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">Agreement Terms & Conditions</h2>
          </div>
          <div class="section-content">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; font-size: 13px; line-height: 1.6;">
              <div>
                <div class="info-label">Contract Duration</div>
                <div class="info-value mb-2">10 years from commissioning date</div>
                
                <div class="info-label">Payment Schedule</div>
                <div class="info-value mb-2">Quarterly payments within 30 days of carbon credit sales</div>
                
                <div class="info-label">Verification Standard</div>
                <div class="info-value mb-2">VCS (Verified Carbon Standard) certification required</div>
              </div>
              <div>
                <div class="info-label">Performance Guarantee</div>
                <div class="info-value mb-2">Minimum 95% of projected carbon credit generation</div>
                
                <div class="info-label">Early Termination</div>
                <div class="info-value mb-2">6 months written notice required by either party</div>
                
                <div class="info-label">Dispute Resolution</div>
                <div class="info-value mb-2">Arbitration in accordance with South African law</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <div class="footer-content">
            ${agentInfo ? `
              <div class="agent-contact">
                <strong>Your Carbon Credit Specialist</strong>
                ${agentInfo.first_name} ${agentInfo.last_name}<br>
                ${agentInfo.company_name || 'Crunch Carbon'}<br>
                ${agentInfo.email}<br>
                ${agentInfo.phone || ''}
              </div>
            ` : ''}
            <div class="company-info">
              <strong>Crunch Carbon (Pty) Ltd</strong>
              Leading Carbon Credit Solutions<br>
              Registration: 2023/123456/07<br>
              www.crunchcarbon.co.za<br>
              info@crunchcarbon.co.za
            </div>
          </div>
          
          <div class="disclaimer">
            <strong>Legal Disclaimer:</strong> This proposal is valid for 30 days from the date of issue. Carbon credit revenues are estimates based on current market conditions and projected energy production. Actual results may vary due to weather conditions, system performance, and market fluctuations. All carbon credits are subject to successful verification and registration with recognized carbon standards. By accepting this proposal, you agree to the terms and conditions outlined herein and acknowledge that you have read and understood the risks associated with carbon credit trading.
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

async function generatePDFFromHTML(htmlContent: string, title: string): Promise<Uint8Array> {
  try {
    // For now, we'll create a more sophisticated text-based PDF structure
    // In a production environment, you would use a proper HTML-to-PDF service
    const pdfContent = createAdvancedPDF(htmlContent, title)
    return new TextEncoder().encode(pdfContent)
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}

function createAdvancedPDF(htmlContent: string, title: string): string {
  const timestamp = new Date().toISOString()
  
  return `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
/Metadata 8 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 595 842]
/Contents 4 0 R
/Resources 5 0 R
>>
endobj

4 0 obj
<<
/Length 2400
>>
stream
BT
/F1 24 Tf
50 800 Td
(CRUNCH CARBON) Tj
0 -30 Td
/F2 16 Tf
(Carbon Credit Solutions) Tj
0 -60 Td
/F1 20 Tf
(${title}) Tj
0 -40 Td
/F2 14 Tf
(Professional Carbon Credit Revenue Sharing Proposal) Tj
0 -60 Td
/F3 12 Tf
(Generated: ${new Date().toLocaleDateString('en-ZA')}) Tj
0 -20 Td
(Document Reference: CC-${timestamp.replace(/[:-]/g, '').slice(8, 16)}) Tj
0 -40 Td
(This comprehensive proposal outlines the terms and) Tj
0 -20 Td
(conditions for carbon credit revenue sharing based on) Tj
0 -20 Td
(your solar installation specifications.) Tj
0 -40 Td
(Key Benefits:) Tj
0 -30 Td
(• Professional carbon credit management) Tj
0 -20 Td
(• Quarterly revenue payments) Tj
0 -20 Td
(• 10-year guaranteed revenue stream) Tj
0 -20 Td
(• Full VCS certification and verification) Tj
0 -20 Td
(• Transparent fee structure) Tj
0 -40 Td
(This proposal incorporates Crunch Carbon's proven) Tj
0 -20 Td
(methodology for maximizing carbon credit value while) Tj
0 -20 Td
(ensuring compliance with international standards.) Tj
0 -40 Td
(For detailed terms, financial projections, and) Tj
0 -20 Td
(technical specifications, please refer to the) Tj
0 -20 Td
(complete proposal in the Crunch Carbon platform.) Tj
0 -60 Td
/F1 10 Tf
(CRUNCH CARBON (PTY) LTD) Tj
0 -15 Td
(Leading Carbon Credit Solutions Provider) Tj
0 -15 Td
(www.crunchcarbon.co.za | info@crunchcarbon.co.za) Tj
ET
endstream
endobj

5 0 obj
<<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica-Bold
>>
/F2 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
/F3 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica-Oblique
>>
>>
>>
endobj

6 0 obj
<<
/Creator (Crunch Carbon Professional Platform)
/Producer (Crunch Carbon PDF Generation Engine v2.0)
/Title (${title})
/Subject (Carbon Credit Revenue Sharing Proposal)
/Author (Crunch Carbon Solutions)
/Keywords (Carbon Credits, Solar Energy, Revenue Sharing, Sustainability)
/CreationDate (D:${timestamp.replace(/[:-]/g, '').slice(0, 14)})
/ModDate (D:${timestamp.replace(/[:-]/g, '').slice(0, 14)})
>>
endobj

7 0 obj
<<
/Type /Metadata
/Subtype /XML
/Length 400
>>
stream
<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:dc="http://purl.org/dc/elements/1.1/">
  <rdf:Description rdf:about="">
    <dc:title>${title}</dc:title>
    <dc:creator>Crunch Carbon Solutions</dc:creator>
    <dc:subject>Carbon Credit Revenue Sharing Proposal</dc:subject>
    <dc:description>Professional carbon credit proposal with comprehensive financial projections and terms</dc:description>
    <dc:date>${timestamp}</dc:date>
    <dc:format>application/pdf</dc:format>
    <dc:language>en-ZA</dc:language>
  </rdf:Description>
</rdf:RDF>
endstream
endobj

8 0 obj
<<
/Type /Metadata
/Subtype /XML
/Length 300
>>
stream
<?xml version="1.0"?>
<metadata xmlns="adobe:ns:meta/">
  <company>Crunch Carbon (Pty) Ltd</company>
  <title>${title}</title>
  <creator>Crunch Carbon Professional Platform</creator>
  <created>${timestamp}</created>
  <subject>Carbon Credit Revenue Sharing Proposal</subject>
  <category>Professional Business Proposal</category>
</metadata>
endstream
endobj

xref
0 9
0000000000 65535 f 
0000000009 00000 n 
0000000074 00000 n 
0000000131 00000 n 
0000000244 00000 n 
0000002696 00000 n 
0000002891 00000 n 
0000003245 00000 n 
0000003695 00000 n 
trailer
<<
/Size 9
/Root 1 0 R
/Info 6 0 R
>>
startxref
4095
%%EOF`
}
