import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export function useCessionAgreementPdf() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const pdfLogger = logger.withContext({
    component: 'CessionAgreementPdf',
    feature: 'cession-pdf-generation'
  });

  const downloadAgreement = async (proposalId: string, filename?: string) => {
    setLoading(true);
    pdfLogger.info('Starting cession agreement PDF generation', { proposalId });

    try {
      // Refresh session before edge function call
      await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke('generate-cession-agreement-pdf', {
        body: { proposalId }
      });

      if (error) {
        pdfLogger.error('Edge function error', { error });
        toast({
          title: "PDF Generation Failed",
          description: "There was an error generating the agreement PDF. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (!data?.success || !data?.pdf_url) {
        pdfLogger.error('PDF generation failed', { data });
        toast({
          title: "PDF Generation Failed",
          description: data?.error || "Unknown error occurred",
          variant: "destructive",
        });
        return;
      }

      // Download as blob
      const downloadFilename = filename || `cession-agreement-${proposalId}.pdf`;
      const response = await fetch(`${data.pdf_url}?download=${encodeURIComponent(downloadFilename)}`);
      if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      toast({ title: "Success", description: "Agreement PDF downloaded" });
      pdfLogger.info('Cession agreement PDF downloaded', { proposalId });

    } catch (error) {
      pdfLogger.error('Cession agreement PDF error', { error });
      toast({
        title: "Download Failed",
        description: "Could not download the agreement PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return { loading, downloadAgreement };
}
