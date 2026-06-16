import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AutomationToggleProps {
  proposalId: string;
  automationPaused: boolean;
  pauseReason?: string | null;
  onUpdate?: () => void;
}

export function AutomationToggle({ 
  proposalId, 
  automationPaused, 
  pauseReason,
  onUpdate 
}: AutomationToggleProps) {
  const [isPaused, setIsPaused] = useState(automationPaused);
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [reason, setReason] = useState(pauseReason || '');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleToggle = async (checked: boolean) => {
    if (!checked) {
      // Pausing - show dialog for reason
      setShowReasonDialog(true);
    } else {
      // Resuming - no reason needed
      await updateAutomation(true, null);
    }
  };

  const updateAutomation = async (paused: boolean, pauseReason: string | null) => {
    setLoading(true);
    
    const { error } = await supabase
      .from('proposals')
      .update({ 
        automation_paused: paused,
        automation_pause_reason: pauseReason
      })
      .eq('id', proposalId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update automation settings",
        variant: "destructive"
      });
    } else {
      setIsPaused(paused);
      toast({
        title: paused ? "Automation Paused" : "Automation Resumed",
        description: paused 
          ? "Follow-up emails will not be sent automatically" 
          : "Automatic follow-ups are now enabled"
      });
      onUpdate?.();
    }
    
    setLoading(false);
    setShowReasonDialog(false);
  };

  const handleSaveReason = () => {
    if (!reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for pausing automation",
        variant: "destructive"
      });
      return;
    }
    updateAutomation(false, reason);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Switch
          id="automation-toggle"
          checked={!isPaused}
          onCheckedChange={handleToggle}
          disabled={loading}
        />
        <Label htmlFor="automation-toggle" className="text-sm cursor-pointer">
          {isPaused ? '🔕 Automation Paused' : '✅ Auto Follow-ups'}
        </Label>
      </div>

      <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause Automation</DialogTitle>
            <DialogDescription>
              Why are you pausing automated follow-ups for this proposal?
            </DialogDescription>
          </DialogHeader>
          
          <Textarea
            placeholder="e.g., Client requested direct contact only, waiting for additional info, etc."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReasonDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveReason} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pause Automation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
