import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface ProposalPdfResult {
  success: boolean;
  pdf_url?: string;
  cached?: boolean;
  generated?: boolean;
  error?: string;
}

export function useProposalPdf() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const pdfLogger = logger.withContext({
    component: 'ProposalPdf',
    feature: 'pdf-generation'
  });

  const generatePdf = async (proposalId: string, forceRegenerate = false): Promise<string | null> => {
    setLoading(true);
    pdfLogger.info('Starting PDF generation', { proposalId, forceRegenerate });

    try {
      const { data, error } = await supabase.functions.invoke('generate-proposal-pdf', {
        body: { proposalId, forceRegenerate }
      });

      if (error) {
        pdfLogger.error('Edge function error', { error });
        toast({
          title: "PDF Generation Failed",
          description: "There was an error generating the PDF. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      const result = data as ProposalPdfResult;

      if (!result.success) {
        pdfLogger.error('PDF generation failed', { result });
        toast({
          title: "PDF Generation Failed", 
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
        return null;
      }

      pdfLogger.info('PDF generated successfully', { 
        pdfUrl: result.pdf_url,
        cached: result.cached,
        generated: result.generated
      });

      const message = result.cached 
        ? "PDF ready for download" 
        : "PDF generated successfully";

      toast({
        title: "Success",
        description: message,
      });

      return result.pdf_url || null;

    } catch (error) {
      pdfLogger.error('PDF generation error', { error });
      toast({
        title: "PDF Generation Failed",
        description: "There was an unexpected error. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async (proposalId: string, filename?: string) => {
    const pdfUrl = await generatePdf(proposalId);
    
    if (pdfUrl) {
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = filename || `proposal-${proposalId}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      pdfLogger.info('PDF download initiated', { pdfUrl, filename });
    }
  };

  return {
    loading,
    generatePdf,
    downloadPdf,
  };
}