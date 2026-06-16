import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Copy, Check, AlertTriangle, Clock } from "lucide-react";

interface ApiKeyRevealDialogProps {
  apiKey: string | null;
  onClose: () => void;
}

export function ApiKeyRevealDialog({ apiKey, onClose }: ApiKeyRevealDialogProps) {
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60);

  useEffect(() => {
    if (!apiKey) {
      setTimeRemaining(60);
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          onClose();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [apiKey, onClose]);

  const handleCopy = async () => {
    if (apiKey) {
      try {
        await navigator.clipboard.writeText(apiKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Silent fallback — admin context, clipboard permission may not be granted
      }
    }
  };

  if (!apiKey) return null;

  return (
    <Dialog open={!!apiKey} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            New API Key Generated
          </DialogTitle>
          <DialogDescription>
            This key will only be shown once. Make sure to save it securely.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold">Copy this key now!</p>
                <p>This dialog will automatically close and the key cannot be recovered.</p>
              </div>
            </div>
          </div>

          <div className="bg-muted rounded-lg p-4">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">API Key</Label>
            <div className="flex items-center gap-2 mt-2">
              <code className="flex-1 text-sm font-mono bg-background p-3 rounded border break-all">
                {apiKey}
              </code>
              <Button size="icon" variant="outline" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Auto-closing in {timeRemaining}s</span>
            </div>
            <Button onClick={onClose}>
              I've Saved the Key
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
