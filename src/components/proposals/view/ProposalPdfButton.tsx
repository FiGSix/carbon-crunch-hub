import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useProposalPdf } from '@/hooks/proposals/view/useProposalPdf';

interface ProposalPdfButtonProps {
  proposalId: string;
  proposalTitle?: string;
  disabled?: boolean;
}

export function ProposalPdfButton({ 
  proposalId, 
  proposalTitle = 'Carbon Credit Proposal',
  disabled = false 
}: ProposalPdfButtonProps) {
  const { loading, downloadPdf } = useProposalPdf();

  const handleDownload = () => {
    const filename = `${proposalTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
    downloadPdf(proposalId, filename);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={disabled || loading}
            className="flex items-center gap-1 text-primary hover:text-primary-dark hover:bg-primary/10"
          >
            <Download className="h-4 w-4" />
            {loading ? 'Generating...' : 'Download PDF'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Download proposal as PDF</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}