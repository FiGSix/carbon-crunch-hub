
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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user is an admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🚀 Starting bulk PDF generation for admin:', user.id)

    // Get all proposals missing PDFs
    const { data: proposalsMissingPdfs, error: fetchError } = await supabaseClient
      .rpc('get_proposals_missing_pdfs')

    if (fetchError) {
      console.error('❌ Error fetching proposals:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch proposals' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!proposalsMissingPdfs || proposalsMissingPdfs.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No proposals require PDF generation',
          batchId: null,
          totalProposals: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 Found ${proposalsMissingPdfs.length} proposals needing PDFs`)

    // Create a batch record
    const { data: batch, error: batchError } = await supabaseClient
      .from('pdf_generation_batches')
      .insert({
        created_by: user.id,
        total_proposals: proposalsMissingPdfs.length,
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (batchError) {
      console.error('❌ Error creating batch:', batchError)
      return new Response(
        JSON.stringify({ error: 'Failed to create batch' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📦 Created batch ${batch.id} for ${proposalsMissingPdfs.length} proposals`)

    // Start processing proposals in background
    const processProposals = async () => {
      let processed = 0
      let successful = 0
      let failed = 0

      for (const proposal of proposalsMissingPdfs) {
        try {
          console.log(`📄 Processing PDF for proposal: ${proposal.id}`)

          // Call the existing PDF generation function
          const { data: pdfResult, error: pdfError } = await supabaseClient.functions.invoke('generate-proposal-pdf', {
            body: { proposalId: proposal.id }
          })

          if (pdfError || !pdfResult?.success) {
            console.error(`❌ PDF generation failed for ${proposal.id}:`, pdfError || pdfResult?.error)
            failed++
          } else {
            console.log(`✅ PDF generated successfully for ${proposal.id}`)
            successful++
          }

          processed++

          // Update batch progress every 5 proposals or at the end
          if (processed % 5 === 0 || processed === proposalsMissingPdfs.length) {
            await supabaseClient.rpc('update_batch_progress', {
              batch_id: batch.id,
              new_processed: processed,
              new_successful: successful,
              new_failed: failed,
              new_status: processed === proposalsMissingPdfs.length ? 'completed' : 'processing'
            })
            console.log(`📊 Batch progress: ${processed}/${proposalsMissingPdfs.length} (${successful} successful, ${failed} failed)`)
          }

          // Small delay to prevent overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 100))

        } catch (error) {
          console.error(`💥 Unexpected error processing ${proposal.id}:`, error)
          failed++
          processed++
        }
      }

      // Final batch update
      await supabaseClient.rpc('update_batch_progress', {
        batch_id: batch.id,
        new_processed: processed,
        new_successful: successful,
        new_failed: failed,
        new_status: 'completed'
      })

      console.log(`🎉 Bulk PDF generation completed. Processed: ${processed}, Successful: ${successful}, Failed: ${failed}`)
    }

    // Run processing in background
    EdgeRuntime.waitUntil(processProposals())

    // Return immediate response
    return new Response(
      JSON.stringify({
        message: 'Bulk PDF generation started',
        batchId: batch.id,
        totalProposals: proposalsMissingPdfs.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Unexpected error in bulk-generate-pdfs:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
