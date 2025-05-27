
export async function uploadPDFToStorage(
  supabaseClient: any, 
  pdfBuffer: Uint8Array, 
  proposalId: string
): Promise<{ fileName: string; publicUrl: string }> {
  const fileName = `proposal-${proposalId}-${Date.now()}.pdf`
  
  const { data: uploadData, error: uploadError } = await supabaseClient.storage
    .from('proposal-pdfs')
    .upload(fileName, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false
    })

  if (uploadError) {
    throw new Error(`Failed to upload PDF: ${uploadError.message}`)
  }

  // Get public URL for the PDF
  const { data: urlData } = supabaseClient.storage
    .from('proposal-pdfs')
    .getPublicUrl(fileName)

  return {
    fileName,
    publicUrl: urlData.publicUrl
  }
}

export async function updateProposalWithPDFInfo(
  supabaseClient: any,
  proposalId: string,
  pdfUrl: string
): Promise<void> {
  await supabaseClient
    .from('proposals')
    .update({
      pdf_url: pdfUrl,
      pdf_generated_at: new Date().toISOString(),
      pdf_generation_status: 'completed'
    })
    .eq('id', proposalId)
}

export async function updateProposalStatus(
  supabaseClient: any,
  proposalId: string,
  status: string
): Promise<void> {
  await supabaseClient
    .from('proposals')
    .update({ pdf_generation_status: status })
    .eq('id', proposalId)
}
