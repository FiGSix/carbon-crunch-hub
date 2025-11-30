import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileCheck, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

interface SignedAgreementDownloadButtonProps {
  proposalId: string;
  proposalTitle?: string;
}

export function SignedAgreementDownloadButton({ 
  proposalId, 
  proposalTitle = "Proposal" 
}: SignedAgreementDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const downloadLogger = logger.withContext({
    component: 'SignedAgreementDownload',
    feature: 'pdf-download'
  });

  // Helper function to extract storage path from URL
  const extractStoragePathFromUrl = (url: string): string | null => {
    // Match pattern: .../storage/v1/object/[public|sign|authenticated]/bucket-name/path
    const match = url.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/[^/]+\/(.+)$/);
    return match ? match[1] : null;
  };

  useEffect(() => {
    fetchSignedPdfUrl();
  }, [proposalId]);

  const fetchSignedPdfUrl = async () => {
    try {
      const { data, error } = await supabase
        .from('proposal_agreements')
        .select('signed_pdf_url')
        .eq('proposal_id', proposalId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        downloadLogger.error('Error fetching signed PDF URL', { error });
        return;
      }

      if (data?.signed_pdf_url) {
        setSignedPdfUrl(data.signed_pdf_url);
        downloadLogger.info('Signed PDF URL found', { url: data.signed_pdf_url });
      } else {
        downloadLogger.info('No signed PDF available yet');
      }
    } catch (error) {
      downloadLogger.error('Failed to fetch signed PDF URL', { error });
    }
  };

  const handleDownload = async () => {
    if (!signedPdfUrl) {
      toast({
        title: "Not Available",
        description: "Signed agreement PDF is not available yet. It may still be generating.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    downloadLogger.info('Starting signed PDF download', { proposalId, signedPdfUrl });

    try {
      const filename = `Signed_Agreement_${proposalTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Extract file path from the storage URL
      const filePath = extractStoragePathFromUrl(signedPdfUrl);
      
      if (!filePath) {
        throw new Error('Invalid storage URL format');
      }
      
      downloadLogger.info('Downloading from storage', { filePath });
      
      // Use Supabase storage API (automatically includes auth token)
      const { data, error } = await supabase.storage
        .from('signed-agreements')
        .download(filePath);
      
      if (error) {
        downloadLogger.error('Storage download error', { error });
        throw new Error(`Failed to download: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('No data received from storage');
      }
      
      // Create blob URL and trigger download
      const blobUrl = URL.createObjectURL(data);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl);
      
      downloadLogger.info('Signed PDF download completed', { filename });
      
      toast({
        title: "Download Started",
        description: "Your signed agreement is downloading.",
      });
    } catch (error) {
      downloadLogger.error('Signed PDF download failed', { error, signedPdfUrl });
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      toast({
        title: "Download Failed",
        description: errorMessage.includes('not found') 
          ? "The file could not be found. It may have been moved or deleted."
          : errorMessage.includes('access denied') || errorMessage.includes('unauthorized')
          ? "You don't have permission to download this file."
          : "Could not download the signed agreement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Don't show button if no signed PDF is available
  if (!signedPdfUrl) {
    return null;
  }

  return (
    <Button
      onClick={handleDownload}
      disabled={loading}
      variant="outline"
      size="default"
      className="gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Downloading...
        </>
      ) : (
        <>
          <FileCheck className="h-4 w-4" />
          Download Signed Agreement
        </>
      )}
    </Button>
  );
}
