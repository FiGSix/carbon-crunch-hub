import React, { useState } from 'react';
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
import { AgentData } from './AgentsManagementTable';

interface CommissionOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: AgentData;
  onSave: (commission: number | null) => void;
}

export function CommissionOverrideDialog({
  open,
  onOpenChange,
  agent,
  onSave
}: CommissionOverrideDialogProps) {
  const [commission, setCommission] = useState(
    agent.commission_override?.toString() || ''
  );
  const [useDefault, setUseDefault] = useState(!agent.commission_override);

  const handleSave = () => {
    if (useDefault) {
      onSave(null);
    } else {
      const value = parseFloat(commission);
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
          <DialogTitle>Set Commission Override</DialogTitle>
          <DialogDescription>
            Configure a custom commission rate for {agent.agent_name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Agent Details</Label>
            </div>
            <div className="p-3 bg-muted rounded-lg space-y-1">
              <div className="font-medium">{agent.agent_name}</div>
              <div className="text-sm text-muted-foreground">{agent.agent_email}</div>
              {agent.company_name && (
                <div className="text-sm text-muted-foreground">{agent.company_name}</div>
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
                Use default commission rate
                <Badge variant="secondary" className="ml-2">
                  5.0%
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
              <Label htmlFor="use-override">Custom commission rate</Label>
            </div>
            
            {!useDefault && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="commission">Commission Percentage</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="commission"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    placeholder="5.0"
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

          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Commission overrides apply to all future proposals. 
              Existing proposals will retain their original commission rates.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!useDefault && (!commission || isNaN(parseFloat(commission)))}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}