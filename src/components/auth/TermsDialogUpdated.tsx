import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { useLegalDocument } from "@/hooks/useLegalDocuments";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TermsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (documentId: string, version: number) => void;
  isLoading: boolean;
}

export const TermsDialogUpdated = ({ open, onOpenChange, onAccept, isLoading }: TermsDialogProps) => {
  const { data: document, isLoading: documentLoading } = useLegalDocument("agent_referral_agreement");

  const handleAccept = () => {
    if (document) {
      onAccept(document.id, document.current_version);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button 
          type="button" 
          variant="link" 
          className="h-auto p-0 text-carbon-green-600 hover:underline"
          disabled={isLoading}
        >
          Agent Referral Agreement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {document?.title || "Agent Referral Agreement"}
          </DialogTitle>
          <DialogDescription>
            Please read the following agreement carefully
            {document && (
              <span className="ml-2 text-xs">
                (Version {document.current_version})
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        {documentLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : document ? (
          <>
            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-4 text-sm whitespace-pre-wrap">
                {document.content}
              </div>
            </ScrollArea>
            
            <div className="pt-4 flex items-center justify-between border-t">
              <p className="text-xs text-muted-foreground">
                Effective: {new Date(document.effective_date).toLocaleDateString()}
              </p>
              <Button
                onClick={handleAccept}
                className="bg-carbon-green-500 hover:bg-carbon-green-600"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "I Agree to the Terms & Conditions"
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Agreement not available. Please contact support.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};