import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useBulkMoveToOnboarding } from "@/hooks/proposals/useBulkMoveToOnboarding";
import { ArrowRight, Loader2, CheckCircle2, AlertCircle, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Proposal {
  id: string;
  title: string;
  client_name: string;
  status: string;
  created_at: string;
}

interface BulkMoveToOnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BulkMoveToOnboardingDialog({
  open,
  onOpenChange,
  onSuccess,
}: BulkMoveToOnboardingDialogProps) {
  const { user, userRole } = useAuth();
  const { moveToOnboarding, isProcessing, result, reset } = useBulkMoveToOnboarding();
  
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoadingProposals, setIsLoadingProposals] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Fetch draft/pending proposals when dialog opens
  useEffect(() => {
    if (open && user?.id && userRole) {
      loadProposals();
      reset();
      setShowResults(false);
    }
  }, [open, user?.id, userRole]);

  const loadProposals = async () => {
    setIsLoadingProposals(true);
    try {
      // Fetch proposals that are in draft or pending status (not yet signed)
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          id,
          title,
          status,
          created_at,
          content
        `)
        .is('signed_at', null)
        .is('deleted_at', null)
        .is('archived_at', null)
        .in('status', ['draft', 'pending'])
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const formattedProposals: Proposal[] = (data || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        client_name: p.content?.clientInformation?.name || 'Unknown Client',
        status: p.status,
        created_at: p.created_at
      }));

      setProposals(formattedProposals);
    } catch (error) {
      console.error('Error loading proposals:', error);
    } finally {
      setIsLoadingProposals(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === proposals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(proposals.map(p => p.id)));
    }
  };

  const handleToggleProposal = (proposalId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(proposalId)) {
      newSelected.delete(proposalId);
    } else {
      newSelected.add(proposalId);
    }
    setSelectedIds(newSelected);
  };

  const handleMoveToOnboarding = async () => {
    if (selectedIds.size === 0) return;

    try {
      await moveToOnboarding(Array.from(selectedIds));
      setShowResults(true);
      
      // If all succeeded, close dialog and refresh
      if (result?.failureCount === 0) {
        setTimeout(() => {
          onSuccess();
          onOpenChange(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Move to onboarding failed:', error);
    }
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setShowResults(false);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Bulk Move to Onboarding
          </DialogTitle>
          <DialogDescription>
            Select proposals to move to the onboarding stage. This will mark them as "signed" and create onboarding records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Results Display */}
          {showResults && result && (
            <div
              className={`border rounded-lg p-4 ${
                result.successCount > 0 && result.failureCount === 0
                  ? 'bg-green-50 border-green-200'
                  : result.failureCount > 0
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-destructive/10 border-destructive/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {result.successCount > 0 && result.failureCount === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                <h3 className="font-semibold">Operation Results</h3>
              </div>
              <div className="space-y-1 text-sm">
                <p>Total Proposals: {result.totalRequested}</p>
                <p className="text-green-600">✓ Successfully Moved: {result.successCount}</p>
                {result.failureCount > 0 && (
                  <>
                    <p className="text-destructive">✗ Failed: {result.failureCount}</p>
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {result.errors.map((error, idx) => (
                        <p key={idx} className="text-muted-foreground text-xs">
                          {error.proposalId}: {error.error}
                        </p>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoadingProposals && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Proposals List */}
          {!isLoadingProposals && !showResults && (
            <>
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedIds.size === proposals.length && proposals.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    Select All ({proposals.length} proposals)
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} selected
                </span>
              </div>

              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {proposals.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No draft or pending proposals found</p>
                      <p className="text-sm">All proposals have already been moved to onboarding or signed</p>
                    </div>
                  ) : (
                    proposals.map((proposal) => (
                      <div
                        key={proposal.id}
                        className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleToggleProposal(proposal.id)}
                      >
                        <Checkbox
                          checked={selectedIds.has(proposal.id)}
                          onCheckedChange={() => handleToggleProposal(proposal.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{proposal.title}</p>
                          <p className="text-sm text-muted-foreground">
                            Client: {proposal.client_name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                              {proposal.status}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(proposal.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
              {showResults && result?.successCount === result?.totalRequested ? 'Close' : 'Cancel'}
            </Button>
            {!showResults && (
              <Button
                onClick={handleMoveToOnboarding}
                disabled={selectedIds.size === 0 || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Moving to Onboarding...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Move {selectedIds.size} to Onboarding
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
