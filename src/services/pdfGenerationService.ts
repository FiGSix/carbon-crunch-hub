
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface PDFGenerationResult {
  success: boolean;
  pdfUrl?: string;
  fileName?: string;
  error?: string;
}

/**
 * Generate PDF for a proposal
 */
export async function generateProposalPDF(proposalId: string): Promise<PDFGenerationResult> {
  const pdfLogger = logger.withContext({
    component: 'PDFGenerationService',
    method: 'generateProposalPDF',
    proposalId
  });

  try {
    pdfLogger.info("Initiating PDF generation", { proposalId });

    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke('generate-proposal-pdf', {
      body: { proposalId }
    });

    if (error) {
      pdfLogger.error("Edge function error", { error });
      return {
        success: false,
        error: error.message || 'Failed to generate PDF'
      };
    }

    if (!data.success) {
      pdfLogger.error("PDF generation failed", { data });
      return {
        success: false,
        error: data.error || 'PDF generation failed'
      };
    }

    pdfLogger.info("PDF generated successfully", { 
      pdfUrl: data.pdfUrl,
      fileName: data.fileName 
    });

    return {
      success: true,
      pdfUrl: data.pdfUrl,
      fileName: data.fileName
    };

  } catch (error) {
    pdfLogger.error("Unexpected error generating PDF", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Download PDF file
 */
export async function downloadProposalPDF(pdfUrl: string, fileName: string): Promise<void> {
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch PDF');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
  } catch (error) {
    logger.error("Error downloading PDF", { error, pdfUrl, fileName });
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
  try {
    const { data, error } = await supabase
      .from('proposals')
      .select('pdf_generation_status, pdf_url, pdf_generated_at')
      .eq('id', proposalId)
      .single();

    if (error) {
      throw error;
    }

    return {
      status: data.pdf_generation_status || 'pending',
      pdfUrl: data.pdf_url || undefined,
      generatedAt: data.pdf_generated_at || undefined
    };

  } catch (error) {
    logger.error("Error fetching PDF status", { error, proposalId });
    throw error;
  }
}
