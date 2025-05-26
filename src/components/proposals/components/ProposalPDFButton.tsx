
import React, { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { generateProposalPDF, downloadProposalPDF } from "@/services/pdfGenerationService";
import { Proposal } from "../types";

interface ProposalPDFButtonProps {
  proposal: Proposal;
  onPDFGenerated?: () => void;
}

export function ProposalPDFButton({ proposal, onPDFGenerated }: ProposalPDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    
    try {
      const result = await generateProposalPDF(proposal.id);
      
      if (result.success && result.pdfUrl && result.fileName) {
        toast({
          title: "PDF Generated",
          description: "Your proposal PDF has been generated successfully.",
        });
        
        // Automatically download the PDF
        await downloadProposalPDF(result.pdfUrl, result.fileName);
        
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

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleGeneratePDF}
      disabled={isGenerating}
      className="retro-button"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <FileText className="h-4 w-4 mr-1" />
          PDF
        </>
      )}
    </Button>
  );
}
