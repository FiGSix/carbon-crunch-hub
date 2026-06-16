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
   * Mint a fresh signed URL for the proposal PDF.
   * - Fast path: try get-pdf-signed-url directly (works for already-generated PDFs).
   * - If the signed-url function reports the PDF is not available yet, OR if the
   *   caller asked to forceRegenerate, run generate-proposal-pdf and re-mint.
   */
  const generatePdf = async (
    proposalId: string,
    forceRegenerate = false,
    invitationToken?: string,
    downloadFilename?: string,
  ): Promise<string | null> => {
    setLoading(true);
    pdfLogger.info('Starting PDF download flow', { proposalId, forceRegenerate, hasToken: !!invitationToken });

    const mintSignedUrl = async () =>
      supabase.functions.invoke('get-pdf-signed-url', {
        body: { proposalId, kind: 'proposal', invitationToken, download: downloadFilename },
      });

    const explainError = (err: any, context: string): string => {
      const status = err?.context?.status ?? err?.status;
      const msg = err?.message || '';
      if (status === 401 || /401|unauthorized/i.test(msg)) {
        return 'Your session has expired. Please refresh the page and sign in again.';
      }
      if (status === 403 || /403|forbidden/i.test(msg)) {
        return "You don't have permission to download this PDF.";
      }
      if (status === 404 || /not found|not available/i.test(msg)) {
        return 'PDF is not available yet. Try "Regenerate & Download".';
      }
      pdfLogger.error(context, { err });
      return 'Could not generate a download link.';
    };

    try {
      // 1. Fast path — skip generation when not explicitly forced.
      if (!forceRegenerate) {
        const { data: signed, error: signErr } = await mintSignedUrl();
        if (!signErr && signed?.signed_url) {
          pdfLogger.info('PDF signed URL ready (fast path)');
          return signed.signed_url as string;
        }
        // If the signed URL function says "not available yet" (404), fall through to generation.
        // For 403/401 there's no point regenerating — bubble up.
        const status = (signErr as any)?.context?.status ?? (signErr as any)?.status;
        if (status && status !== 404) {
          toast({ title: 'Download Failed', description: explainError(signErr, 'Sign URL failed'), variant: 'destructive' });
          return null;
        }
      }

      // 2. Generation path — requires authenticated agent/admin session.
      const { data, error } = await supabase.functions.invoke('generate-proposal-pdf', {
        body: { proposalId, forceRegenerate },
      });

      if (error) {
        toast({ title: 'PDF Generation Failed', description: explainError(error, 'generate-proposal-pdf failed'), variant: 'destructive' });
        return null;
      }

      const result = data as ProposalPdfResult;
      if (!result?.success) {
        pdfLogger.error('PDF generation returned failure', { result });
        toast({ title: 'PDF Generation Failed', description: result?.error || 'Unknown error', variant: 'destructive' });
        return null;
      }

      // 3. Mint a fresh signed URL after generation.
      const { data: signed, error: signErr } = await mintSignedUrl();
      if (signErr || !signed?.signed_url) {
        toast({ title: 'PDF Unavailable', description: explainError(signErr, 'Sign URL failed after generate'), variant: 'destructive' });
        return null;
      }

      pdfLogger.info('PDF ready (generated)', { cached: result.cached });
      return signed.signed_url as string;
    } catch (error) {
      pdfLogger.error('PDF generation error', { error });
      toast({ title: 'Download Failed', description: 'Unexpected error. Please try again.', variant: 'destructive' });
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
      if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
      const blob = await response.blob();
      if (!blob || blob.size === 0) throw new Error('Empty PDF received from storage');
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
      toast({
        title: 'Download Failed',
        description: 'Could not download the PDF from storage. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return { loading, generatePdf, downloadPdf };
}
