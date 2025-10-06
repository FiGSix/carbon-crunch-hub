
import { Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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

  const handleDownload = (forceRegenerate = false) => {
    const filename = `${proposalTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
    downloadPdf(proposalId, filename, forceRegenerate);
  };

  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={disabled || loading}
                className="flex items-center gap-1 text-primary hover:text-primary-dark hover:bg-primary/10"
              >
                <Download className="h-4 w-4" />
                {loading ? 'Generating...' : 'Download PDF'}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Download proposal as PDF</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleDownload(false)}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDownload(true)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Regenerate & Download
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}