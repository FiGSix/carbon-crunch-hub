import { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { ClientData } from '@/hooks/clients/types';
import { Loader2, Lock, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getClientSharePercentage } from '@/services/calculations/carbon/pricing';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PortfolioClientShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientData | null;
  onSuccess: () => void;
}

interface ProposalInfo {
  id: string;
  title: string;
  clientSharePercentage: number;
  hasIndividualOverride: boolean;
}

export function PortfolioClientShareDialog({
  open,
  onOpenChange,
  client,
  onSuccess,
}: PortfolioClientShareDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProposals, setIsLoadingProposals] = useState(false);
  const [portfolioOverride, setPortfolioOverride] = useState('');
  const [proposals, setProposals] = useState<ProposalInfo[]>([]);

  // Calculate auto-calculated share based on portfolio size
  const autoCalculatedShare = client ? getClientSharePercentage(client.total_mwp * 1000) : 0;

  useEffect(() => {
    if (client && open) {
      // Set portfolio override from client data
      setPortfolioOverride(client.portfolio_client_share_override?.toString() || '');
      
      // Fetch proposals for this client
      fetchClientProposals();
    }
  }, [client, open]);

  const fetchClientProposals = async () => {
    if (!client) return;

    setIsLoadingProposals(true);
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select('id, title, client_share_percentage, client_share_override_enabled, system_size_kwp')
        .or(`client_id.eq.${client.client_id},client_reference_id.eq.${client.client_id}`)
        .is('deleted_at', null)
        .is('archived_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const proposalInfos: ProposalInfo[] = (data || []).map((p) => ({
        id: p.id,
        title: p.title || 'Untitled Proposal',
        clientSharePercentage: p.client_share_percentage || 0,
        hasIndividualOverride: p.client_share_override_enabled || false,
      }));

      setProposals(proposalInfos);
    } catch (error) {
      console.error('Error fetching proposals:', error);
      toast({
        title: 'Error',
        description: 'Failed to load client proposals',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingProposals(false);
    }
  };

  const handleApplyToAll = async () => {
    if (!client) return;

    const percentageValue = parseFloat(portfolioOverride);
    if (isNaN(percentageValue) || percentageValue < 0 || percentageValue > 100) {
      toast({
        title: 'Invalid Percentage',
        description: 'Please enter a valid percentage between 0 and 100',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Call edge function to bulk update
      const { data, error } = await supabase.functions.invoke('update-portfolio-client-share', {
        body: {
          clientId: client.client_id,
          clientSharePercentage: percentageValue,
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Updated ${data.proposalsUpdated} proposal${data.proposalsUpdated !== 1 ? 's' : ''} to ${percentageValue}%`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error updating portfolio share:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update portfolio client share',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Portfolio Client Share - {client.client_name}</DialogTitle>
          <DialogDescription>
            Manage the company fee percentage for all proposals in this client's portfolio
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Portfolio Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Current Portfolio</p>
              <p className="text-2xl font-bold">{client.total_mwp.toFixed(2)} MWp</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Auto-Calculated Share</p>
              <p className="text-2xl font-bold">{autoCalculatedShare.toFixed(2)}%</p>
            </div>
          </div>

          {/* Set Portfolio Override */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div>
              <Label htmlFor="portfolioOverride">Set Portfolio Override (%)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="portfolioOverride"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={portfolioOverride}
                  onChange={(e) => setPortfolioOverride(e.target.value)}
                  placeholder="Enter percentage (e.g., 65.00)"
                  disabled={isSubmitting}
                />
                <Button onClick={handleApplyToAll} disabled={isSubmitting || !portfolioOverride}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Apply to All
                </Button>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This will update all {proposals.length} proposal{proposals.length !== 1 ? 's' : ''} for this client
                to use the specified percentage.
              </AlertDescription>
            </Alert>
          </div>

          {/* Individual Proposals List */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Individual Proposals ({proposals.length})</h3>
            {isLoadingProposals ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : proposals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No proposals found for this client
              </p>
            ) : (
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {proposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm truncate">{proposal.title}</span>
                      {proposal.hasIndividualOverride && (
                        <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-sm font-medium flex-shrink-0">
                      {proposal.clientSharePercentage.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Individual override set (can still be changed per proposal)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
