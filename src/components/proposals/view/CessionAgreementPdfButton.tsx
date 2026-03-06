import { FileSignature } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCessionAgreementPdf } from '@/hooks/proposals/view/useCessionAgreementPdf';

interface CessionAgreementPdfButtonProps {
  proposalId: string;
  proposalTitle?: string;
  disabled?: boolean;
}

export function CessionAgreementPdfButton({
  proposalId,
  proposalTitle = 'Cession Agreement',
  disabled = false,
}: CessionAgreementPdfButtonProps) {
  const { loading, downloadAgreement } = useCessionAgreementPdf();

  const handleDownload = () => {
    const filename = `${proposalTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_cession_agreement.pdf`;
    downloadAgreement(proposalId, filename);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || loading}
            onClick={handleDownload}
            className="flex items-center gap-1 text-primary hover:text-primary-dark hover:bg-primary/10"
          >
            <FileSignature className="h-4 w-4" />
            {loading ? 'Generating...' : 'Download Agreement'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Download unsigned cession agreement as PDF</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
