
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { generateProfessionalHTML } from './html-generator.ts'
import { generatePDFFromHTML } from './pdf-generator.ts'
import { fetchProposalData, fetchAgentInfo } from './proposal-fetcher.ts'
import { uploadPDFToStorage, updateProposalWithPDFInfo, updateProposalStatus } from './storage-handler.ts'

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
    await updateProposalStatus(supabaseClient, proposalId, 'generating')

    try {
      // Fetch proposal and agent data
      const proposal = await fetchProposalData(supabaseClient, proposalId)
      const agentInfo = await fetchAgentInfo(supabaseClient, proposal.agent_id)

      // Generate professional HTML content matching Crunch Carbon brand
      const htmlContent = generateProfessionalHTML(proposal, agentInfo)
      
      // Convert HTML to PDF using proper conversion
      const pdfBuffer = await generatePDFFromHTML(htmlContent, proposal.title)
      
      // Upload PDF to storage and get URLs
      const { fileName, publicUrl } = await uploadPDFToStorage(supabaseClient, pdfBuffer, proposalId)

      // Update proposal with PDF info
      await updateProposalWithPDFInfo(supabaseClient, proposalId, publicUrl)

      console.log(`Professional PDF generated successfully for proposal: ${proposalId}`)

      return new Response(
        JSON.stringify({ 
          success: true, 
          pdfUrl: publicUrl,
          fileName: fileName 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (processingError) {
      console.error('Error during PDF processing:', processingError)
      await updateProposalStatus(supabaseClient, proposalId, 'failed')
      
      return new Response(
        JSON.stringify({ error: processingError.message || 'PDF processing failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error in generate-proposal-pdf function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
