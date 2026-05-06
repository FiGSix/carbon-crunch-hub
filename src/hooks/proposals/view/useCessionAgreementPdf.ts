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
      await supabase.auth.getSession();

      // 1. Generate (or refresh) the cession agreement PDF
      const { data, error } = await supabase.functions.invoke('generate-cession-agreement-pdf', {
        body: { proposalId },
      });

      if (error || !data?.success) {
        pdfLogger.error('Edge function error', { error, data });
        toast({ title: 'PDF Generation Failed', description: data?.error || 'Unknown error.', variant: 'destructive' });
        return;
      }

      // 2. Mint a fresh signed URL through get-pdf-signed-url
      const downloadFilename = filename || `cession-agreement-${proposalId}.pdf`;
      const { data: signed, error: signErr } = await supabase.functions.invoke('get-pdf-signed-url', {
        body: { proposalId, kind: 'proposal', download: downloadFilename },
      });

      if (signErr || !signed?.signed_url) {
        pdfLogger.error('Failed to mint signed URL', { signErr });
        toast({ title: 'PDF Unavailable', description: 'Could not generate a download link.', variant: 'destructive' });
        return;
      }

      const response = await fetch(signed.signed_url);
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

      toast({ title: 'Success', description: 'Agreement PDF downloaded' });
      pdfLogger.info('Cession agreement PDF downloaded', { proposalId });
    } catch (error) {
      pdfLogger.error('Cession agreement PDF error', { error });
      toast({ title: 'Download Failed', description: 'Could not download the agreement PDF.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return { loading, downloadAgreement };
}
