
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

    console.log(`Generating PDF for proposal: ${proposalId}`)

    // Update status to generating
    await supabaseClient
      .from('proposals')
      .update({ pdf_generation_status: 'generating' })
      .eq('id', proposalId)

    // Fetch proposal data
    const { data: proposal, error: proposalError } = await supabaseClient
      .from('proposals')
      .select('*')
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

    // Generate HTML content for the PDF
    const htmlContent = generateProposalHTML(proposal)
    
    // Convert HTML to PDF using jsPDF or similar
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

    console.log(`PDF generated successfully for proposal: ${proposalId}`)

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

function generateProposalHTML(proposal: any): string {
  const clientInfo = proposal.content?.clientInfo || {}
  const projectInfo = proposal.project_info || proposal.content?.projectInfo || {}
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${proposal.title} - Carbon Credit Proposal</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 40px; 
          line-height: 1.6; 
          color: #333;
        }
        .header { 
          text-align: center; 
          border-bottom: 2px solid #4a90e2; 
          padding-bottom: 20px; 
          margin-bottom: 30px; 
        }
        .title { 
          font-size: 28px; 
          font-weight: bold; 
          color: #2c3e50; 
          margin-bottom: 10px; 
        }
        .subtitle { 
          font-size: 16px; 
          color: #7f8c8d; 
        }
        .section { 
          margin-bottom: 30px; 
          padding: 20px; 
          border: 1px solid #e8e8e8; 
          border-radius: 8px; 
        }
        .section-title { 
          font-size: 20px; 
          font-weight: bold; 
          color: #2c3e50; 
          margin-bottom: 15px; 
          border-bottom: 1px solid #e8e8e8; 
          padding-bottom: 5px; 
        }
        .info-row { 
          margin-bottom: 10px; 
        }
        .label { 
          font-weight: bold; 
          color: #34495e; 
          display: inline-block; 
          width: 150px; 
        }
        .value { 
          color: #2c3e50; 
        }
        .highlight { 
          background-color: #f8f9fa; 
          padding: 15px; 
          border-radius: 5px; 
          border-left: 4px solid #4a90e2; 
        }
        .footer { 
          margin-top: 40px; 
          text-align: center; 
          color: #7f8c8d; 
          font-size: 12px; 
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">${proposal.title}</div>
        <div class="subtitle">Carbon Credit Proposal</div>
        <div class="subtitle">Generated on ${new Date().toLocaleDateString()}</div>
      </div>

      <div class="section">
        <div class="section-title">Client Information</div>
        <div class="info-row">
          <span class="label">Name:</span>
          <span class="value">${clientInfo.name || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="label">Email:</span>
          <span class="value">${clientInfo.email || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="label">Phone:</span>
          <span class="value">${clientInfo.phone || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="label">Company:</span>
          <span class="value">${clientInfo.companyName || 'N/A'}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Project Information</div>
        <div class="info-row">
          <span class="label">Project Name:</span>
          <span class="value">${projectInfo.name || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="label">Address:</span>
          <span class="value">${projectInfo.address || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="label">System Size:</span>
          <span class="value">${projectInfo.size || 'N/A'} kW</span>
        </div>
        <div class="info-row">
          <span class="label">Commission Date:</span>
          <span class="value">${projectInfo.commissionDate || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="label">Additional Notes:</span>
          <span class="value">${projectInfo.additionalNotes || 'N/A'}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Carbon Credit Details</div>
        <div class="highlight">
          <div class="info-row">
            <span class="label">Annual Energy:</span>
            <span class="value">${proposal.annual_energy ? Math.round(proposal.annual_energy).toLocaleString() : 'N/A'} kWh</span>
          </div>
          <div class="info-row">
            <span class="label">Carbon Credits:</span>
            <span class="value">${proposal.carbon_credits ? proposal.carbon_credits.toFixed(2) : 'N/A'} tons CO2</span>
          </div>
          <div class="info-row">
            <span class="label">Client Share:</span>
            <span class="value">${proposal.client_share_percentage || 80}%</span>
          </div>
          <div class="info-row">
            <span class="label">Agent Commission:</span>
            <span class="value">${proposal.agent_commission_percentage || 5}%</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Proposal Status</div>
        <div class="info-row">
          <span class="label">Status:</span>
          <span class="value">${proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}</span>
        </div>
        <div class="info-row">
          <span class="label">Created:</span>
          <span class="value">${new Date(proposal.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div class="footer">
        This proposal was automatically generated by the Carbon Credit Management System.
      </div>
    </body>
    </html>
  `
}

async function generatePDFFromHTML(htmlContent: string, title: string): Promise<Uint8Array> {
  // For now, we'll create a simple text-based PDF
  // In production, you'd want to use a proper HTML-to-PDF library
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
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
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
50 750 Td
(${title}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
293
%%EOF`

  return new TextEncoder().encode(pdfContent)
}
