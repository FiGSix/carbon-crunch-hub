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

  /**
   * Ensures the proposal PDF exists (generates if needed) and returns a fresh
   * short-lived signed URL via the get-pdf-signed-url edge function.
   */
  const generatePdf = async (
    proposalId: string,
    forceRegenerate = false,
    invitationToken?: string,
    downloadFilename?: string,
  ): Promise<string | null> => {
    setLoading(true);
    pdfLogger.info('Starting PDF generation', { proposalId, forceRegenerate });

    try {
      // 1. Ensure the PDF is generated/upserted in storage
      const { data, error } = await supabase.functions.invoke('generate-proposal-pdf', {
        body: { proposalId, forceRegenerate },
      });

      if (error) {
        pdfLogger.error('Edge function error', { error });
        toast({ title: 'PDF Generation Failed', description: 'There was an error generating the PDF.', variant: 'destructive' });
        return null;
      }

      const result = data as ProposalPdfResult;
      if (!result.success) {
        pdfLogger.error('PDF generation failed', { result });
        toast({ title: 'PDF Generation Failed', description: result.error || 'Unknown error', variant: 'destructive' });
        return null;
      }

      // 2. Mint a fresh signed URL (works with private bucket; respects auth + invitation token)
      const { data: signed, error: signErr } = await supabase.functions.invoke('get-pdf-signed-url', {
        body: { proposalId, kind: 'proposal', invitationToken, download: downloadFilename },
      });

      if (signErr || !signed?.signed_url) {
        pdfLogger.error('Failed to mint signed URL', { signErr });
        toast({ title: 'PDF Unavailable', description: 'Could not generate a download link.', variant: 'destructive' });
        return null;
      }

      pdfLogger.info('PDF ready', { cached: result.cached });
      return signed.signed_url as string;
    } catch (error) {
      pdfLogger.error('PDF generation error', { error });
      toast({ title: 'PDF Generation Failed', description: 'Unexpected error.', variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async (
    proposalId: string,
    filename?: string,
    forceRegenerate = false,
    invitationToken?: string,
  ) => {
    const downloadFilename = filename || `proposal-${proposalId}.pdf`;
    const signedUrl = await generatePdf(proposalId, forceRegenerate, invitationToken, downloadFilename);
    if (!signedUrl) return;

    try {
      const response = await fetch(signedUrl);
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
      pdfLogger.info('PDF download completed', { filename: downloadFilename });
    } catch (error) {
      pdfLogger.error('PDF download failed', { error });
      toast({ title: 'Download Failed', description: 'Could not download the PDF.', variant: 'destructive' });
    }
  };

  return { loading, generatePdf, downloadPdf };
}
