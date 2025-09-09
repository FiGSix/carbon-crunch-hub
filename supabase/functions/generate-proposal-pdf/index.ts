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

// Update edge function to use the new template
async function generatePdfContent(proposal: ProposalData): Promise<Uint8Array> {
  const { generatePdfTemplate } = await import('./proposalPdfTemplate.ts');
  
  const htmlContent = generatePdfTemplate({
    id: proposal.id,
    title: proposal.title,
    client: proposal.client || {},
    agent: proposal.agent || {},
    system_size_kwp: proposal.system_size_kwp || 0,
    carbon_credits: proposal.carbon_credits || 0,
    client_share_percentage: proposal.client_share_percentage || 0,
    agent_commission_percentage: proposal.agent_commission_percentage || 0,
    pdf_version: proposal.pdf_version || 1,
    created_at: proposal.created_at
  });

  const encoder = new TextEncoder();
  return encoder.encode(htmlContent);
}