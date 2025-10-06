import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, AlertCircle, PenTool } from "lucide-react";

interface ApprovalSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (typedName: string) => Promise<void>;
  clientName: string;
  proposalTitle: string;
}

export function ApprovalSignatureDialog({
  open,
  onOpenChange,
  onConfirm,
  clientName,
  proposalTitle,
}: ApprovalSignatureDialogProps) {
  const [hasAgreed, setHasAgreed] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setHasAgreed(false);
      setTypedName("");
      setHasScrolledToBottom(false);
    }
  }, [open]);

  const validateTypedName = (): boolean => {
    const client = clientName.toLowerCase().trim();
    const typed = typedName.toLowerCase().trim();
    
    // Simple fuzzy match - check if all words in client name are in typed name
    const clientWords = client.split(/\s+/);
    return clientWords.every(word => typed.includes(word));
  };

  const isValid = validateTypedName() && typedName.trim().length > 0;
  const canSubmit = hasScrolledToBottom && hasAgreed && isValid;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      await onConfirm(typedName);
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 10;
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            Sign to Approve Proposal
          </DialogTitle>
          <DialogDescription>
            {proposalTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-hidden">
          {/* Terms Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Terms & Conditions</h3>
              {hasScrolledToBottom && (
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Scrolled to bottom</span>
                </div>
              )}
            </div>
            <ScrollArea 
              className="h-[200px] border rounded-lg p-4"
              onScrollCapture={handleScroll}
            >
              <div className="prose prose-sm max-w-none space-y-3 text-sm">
                <p className="font-semibold">Summary of Agreement</p>
                <p>
                  By signing this proposal, you acknowledge and agree to the following key terms:
                </p>
                <ul className="space-y-1 list-disc pl-5">
                  <li>You accept the carbon credit revenue sharing percentages as outlined in the proposal</li>
                  <li>You agree to provide accurate data regarding your solar system for verification purposes</li>
                  <li>Payments will be made quarterly following the successful sale of carbon credits</li>
                  <li>This agreement remains in effect for the duration of the carbon credit generation period</li>
                  <li>Either party may terminate with 90 days written notice</li>
                </ul>
                <p className="font-semibold mt-4">Electronic Signature</p>
                <p>
                  Your electronic signature below has the same legal effect as a handwritten signature.
                  You agree to be bound by all terms and conditions set forth in this proposal.
                </p>
                <p className="font-semibold mt-4">Data Usage</p>
                <p>
                  You consent to the collection and use of your system data for carbon credit registration
                  and verification purposes in accordance with applicable data protection regulations.
                </p>
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              Please scroll to the bottom to continue
            </p>
          </div>

          {/* Agreement Checkbox */}
          <div className="flex items-start space-x-2 p-4 bg-muted/50 rounded-lg">
            <Checkbox
              id="terms"
              checked={hasAgreed}
              onCheckedChange={(checked) => setHasAgreed(checked === true)}
              disabled={!hasScrolledToBottom}
            />
            <Label
              htmlFor="terms"
              className={`text-sm cursor-pointer leading-relaxed ${!hasScrolledToBottom ? 'opacity-50' : ''}`}
            >
              I have read and agree to the terms and conditions outlined above and in the full proposal document
            </Label>
          </div>

          {/* Signature Input */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label htmlFor="signature" className="text-sm font-semibold">
                Type your full name to sign
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Your name must match: {clientName}
              </p>
            </div>
            <Input
              id="signature"
              type="text"
              placeholder="Type your full name"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              disabled={!hasAgreed}
              className={`${
                typedName.trim().length > 0 && !isValid
                  ? 'border-destructive'
                  : ''
              }`}
            />
            {typedName.trim().length > 0 && !isValid && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>Name doesn't match the client name</span>
              </div>
            )}
            {isValid && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Name verified</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="w-full sm:flex-1 bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <PenTool className="mr-2 h-4 w-4" />
                Sign and Approve Proposal
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          By clicking this button, your electronic signature is legally binding
        </p>
      </DialogContent>
    </Dialog>
  );
}
