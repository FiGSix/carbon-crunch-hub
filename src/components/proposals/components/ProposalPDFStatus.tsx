
import React from "react";
import { FileText, Download, AlertCircle, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { downloadProposalPDF } from "@/services/pdfGenerationService";

interface ProposalPDFStatusProps {
  status: string;
  pdfUrl?: string;
  onDownload?: () => void;
}

export function ProposalPDFStatus({ status, pdfUrl, onDownload }: ProposalPDFStatusProps) {
  const { toast } = useToast();

  const handleDownload = async () => {
    if (!pdfUrl) return;

    try {
      const fileName = `crunch-carbon-proposal-${Date.now()}.pdf`;
      await downloadProposalPDF(pdfUrl, fileName);
      
      toast({
        title: "PDF Downloaded",
        description: "Your professional proposal PDF has been downloaded.",
      });
      
      onDownload?.();
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download the PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'completed':
        return {
          icon: CheckCircle,
          label: 'Ready',
          variant: 'default' as const,
          color: 'text-green-600',
          showDownload: true
        };
      case 'generating':
        return {
          icon: RefreshCw,
          label: 'Generating',
          variant: 'secondary' as const,
          color: 'text-blue-600',
          showDownload: false,
          animate: true
        };
      case 'failed':
        return {
          icon: AlertCircle,
          label: 'Failed',
          variant: 'destructive' as const,
          color: 'text-red-600',
          showDownload: false
        };
      case 'pending':
      default:
        return {
          icon: Clock,
          label: 'Pending',
          variant: 'outline' as const,
          color: 'text-gray-600',
          showDownload: false
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  return (
    <div className="flex items-center gap-2">
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent 
          className={`h-3 w-3 ${config.color} ${config.animate ? 'animate-spin' : ''}`} 
        />
        {config.label}
      </Badge>
      
      {config.showDownload && pdfUrl && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          className="h-6 px-2 text-xs"
          title="Download Professional PDF"
        >
          <Download className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
