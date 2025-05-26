
import React, { useState } from "react";
import { Download, FileText, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { generateProposalPDF, downloadProposalPDF, regenerateProposalPDF } from "@/services/pdfGenerationService";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface ProposalPDFButtonProps {
  proposal: {
    id: string;
    name: string; // Changed from title to name to match ProposalListItem
    pdf_url?: string | null;
    pdf_generation_status?: string | null;
  };
  onPDFGenerated?: () => void;
}

export function ProposalPDFButton({ proposal, onPDFGenerated }: ProposalPDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    
    try {
      const result = await generateProposalPDF(proposal.id);
      
      if (result.success && result.pdfUrl && result.fileName) {
        toast({
          title: "Professional PDF Generated",
          description: "Your Crunch Carbon proposal PDF has been generated successfully.",
        });
        
        // Notify parent component
        onPDFGenerated?.();
      } else {
        toast({
          title: "PDF Generation Failed",
          description: result.error || "Failed to generate PDF. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while generating the PDF.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!proposal.pdf_url) {
      toast({
        title: "No PDF Available",
        description: "Please generate a PDF first.",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    
    try {
      const fileName = `crunch-carbon-proposal-${proposal.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      await downloadProposalPDF(proposal.pdf_url, fileName);
      
      toast({
        title: "PDF Downloaded",
        description: "Your proposal PDF has been downloaded successfully.",
      });
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRegeneratePDF = async () => {
    setIsGenerating(true);
    
    try {
      const result = await regenerateProposalPDF(proposal.id);
      
      if (result.success) {
        toast({
          title: "PDF Regenerated",
          description: "Your proposal PDF has been regenerated with the latest data.",
        });
        
        onPDFGenerated?.();
      } else {
        toast({
          title: "Regeneration Failed",
          description: result.error || "Failed to regenerate PDF. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error regenerating PDF:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while regenerating the PDF.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const isLoading = isGenerating || isDownloading;
  const hasPDF = proposal.pdf_url && proposal.pdf_generation_status === 'completed';

  if (hasPDF) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={isLoading}
            className="retro-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                {isDownloading ? 'Downloading...' : 'Processing...'}
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-1" />
                PDF
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={handleDownloadPDF} disabled={isLoading}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleRegeneratePDF} disabled={isLoading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Regenerate PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleGeneratePDF}
      disabled={isLoading}
      className="retro-button"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <FileText className="h-4 w-4 mr-1" />
          Generate PDF
        </>
      )}
    </Button>
  );
}
