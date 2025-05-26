
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface PDFGenerationResult {
  success: boolean;
  pdfUrl?: string;
  fileName?: string;
  error?: string;
}

/**
 * Generate professional PDF for a proposal with Crunch Carbon branding
 */
export async function generateProposalPDF(proposalId: string): Promise<PDFGenerationResult> {
  const pdfLogger = logger.withContext({
    component: 'PDFGenerationService',
    method: 'generateProposalPDF',
    proposalId
  });

  try {
    pdfLogger.info("Initiating professional PDF generation", { proposalId });

    // Call the enhanced Edge Function
    const { data, error } = await supabase.functions.invoke('generate-proposal-pdf', {
      body: { proposalId }
    });

    if (error) {
      pdfLogger.error("Edge function error", { error });
      return {
        success: false,
        error: error.message || 'Failed to generate professional PDF'
      };
    }

    if (!data.success) {
      pdfLogger.error("Professional PDF generation failed", { data });
      return {
        success: false,
        error: data.error || 'Professional PDF generation failed'
      };
    }

    pdfLogger.info("Professional PDF generated successfully", { 
      pdfUrl: data.pdfUrl,
      fileName: data.fileName 
    });

    return {
      success: true,
      pdfUrl: data.pdfUrl,
      fileName: data.fileName
    };

  } catch (error) {
    pdfLogger.error("Unexpected error generating professional PDF", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Download PDF file with improved error handling
 */
export async function downloadProposalPDF(pdfUrl: string, fileName: string): Promise<void> {
  const downloadLogger = logger.withContext({
    component: 'PDFGenerationService',
    method: 'downloadProposalPDF'
  });

  try {
    downloadLogger.info("Starting PDF download", { fileName });

    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    downloadLogger.info("PDF download completed successfully", { fileName });
    
  } catch (error) {
    downloadLogger.error("Error downloading PDF", { error, pdfUrl, fileName });
    throw error;
  }
}

/**
 * Check PDF generation status for a proposal
 */
export async function getProposalPDFStatus(proposalId: string): Promise<{
  status: string;
  pdfUrl?: string;
  generatedAt?: string;
}> {
  const statusLogger = logger.withContext({
    component: 'PDFGenerationService',
    method: 'getProposalPDFStatus',
    proposalId
  });

  try {
    const { data, error } = await supabase
      .from('proposals')
      .select('pdf_generation_status, pdf_url, pdf_generated_at')
      .eq('id', proposalId)
      .single();

    if (error) {
      statusLogger.error("Error fetching PDF status", { error });
      throw error;
    }

    const status = {
      status: data.pdf_generation_status || 'pending',
      pdfUrl: data.pdf_url || undefined,
      generatedAt: data.pdf_generated_at || undefined
    };

    statusLogger.debug("PDF status retrieved", status);
    return status;

  } catch (error) {
    statusLogger.error("Error fetching PDF status", { error, proposalId });
    throw error;
  }
}

/**
 * Regenerate PDF for an existing proposal
 */
export async function regenerateProposalPDF(proposalId: string): Promise<PDFGenerationResult> {
  const regenerateLogger = logger.withContext({
    component: 'PDFGenerationService',
    method: 'regenerateProposalPDF',
    proposalId
  });

  try {
    regenerateLogger.info("Starting PDF regeneration", { proposalId });

    // Reset the PDF status before regeneration
    await supabase
      .from('proposals')
      .update({ 
        pdf_generation_status: 'pending',
        pdf_url: null,
        pdf_generated_at: null
      })
      .eq('id', proposalId);

    // Generate new PDF
    return await generateProposalPDF(proposalId);

  } catch (error) {
    regenerateLogger.error("Error regenerating PDF", { error, proposalId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to regenerate PDF'
    };
  }
}
