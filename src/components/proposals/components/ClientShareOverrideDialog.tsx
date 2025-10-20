import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ProposalListItem } from '@/types/proposals';

interface ClientShareOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: ProposalListItem;
  onSave: (clientShare: number | null) => void;
  autoCalculatedShare: number;
}

export function ClientShareOverrideDialog({
  open,
  onOpenChange,
  proposal,
  onSave,
  autoCalculatedShare
}: ClientShareOverrideDialogProps) {
  const [clientShare, setClientShare] = useState(
    proposal.client_share_percentage?.toString() || ''
  );
  const [useDefault, setUseDefault] = useState(!proposal.client_share_override_enabled);

  const handleSave = () => {
    if (useDefault) {
      onSave(null);
    } else {
      const value = parseFloat(clientShare);
      if (isNaN(value) || value < 0 || value > 100) {
        return; // Invalid input
      }
      onSave(value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Client Share Override</DialogTitle>
          <DialogDescription>
            Configure a custom client share percentage for this proposal
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Proposal Details</Label>
            </div>
            <div className="p-3 bg-muted rounded-lg space-y-1">
              <div className="font-medium">{proposal.name}</div>
              <div className="text-sm text-muted-foreground">{proposal.client}</div>
              {proposal.size && (
                <div className="text-sm text-muted-foreground">Size: {proposal.size} kWp</div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="use-default"
                checked={useDefault}
                onChange={() => setUseDefault(true)}
                className="w-4 h-4"
              />
              <Label htmlFor="use-default" className="flex-1">
                Use auto-calculated client share
                <Badge variant="secondary" className="ml-2">
                  {autoCalculatedShare}%
                </Badge>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="use-override"
                checked={!useDefault}
                onChange={() => setUseDefault(false)}
                className="w-4 h-4"
              />
              <Label htmlFor="use-override">Custom client share</Label>
            </div>
            
            {!useDefault && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="clientShare">Client Share Percentage</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="clientShare"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={clientShare}
                    onChange={(e) => setClientShare(e.target.value)}
                    placeholder={autoCalculatedShare.toString()}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter a value between 0 and 100
                </p>
              </div>
            )}
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> This override only applies to this specific proposal. 
              It does not affect other proposals or the client's portfolio calculations.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!useDefault && (!clientShare || isNaN(parseFloat(clientShare)))}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
