import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface BulkMoveResult {
  success: boolean;
  totalRequested: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ proposalId: string; error: string }>;
  results: Array<{ proposalId: string; title: string; status: string }>;
}

export function useBulkMoveToOnboarding() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<BulkMoveResult | null>(null);

  const moveToOnboarding = async (proposalIds: string[]): Promise<BulkMoveResult> => {
    if (!proposalIds || proposalIds.length === 0) {
      throw new Error('No proposals selected');
    }

    setIsProcessing(true);
    setResult(null);

    try {
      logger.info('Starting bulk move to onboarding', {
        count: proposalIds.length,
        proposalIds: proposalIds.slice(0, 5) // Log first 5 IDs only
      });

      // Call edge function
      const { data, error } = await supabase.functions.invoke('bulk-move-to-onboarding', {
        body: { proposalIds }
      });

      if (error) {
        throw new Error(error.message || 'Failed to move proposals to onboarding');
      }

      const moveResult = data as BulkMoveResult;
      setResult(moveResult);

      // Show success/failure toast
      if (moveResult.successCount > 0) {
        toast({
          title: 'Proposals Moved to Onboarding',
          description: `Successfully moved ${moveResult.successCount} of ${moveResult.totalRequested} proposals. ${
            moveResult.failureCount > 0 ? `${moveResult.failureCount} failed.` : ''
          }`,
          variant: moveResult.failureCount > 0 ? 'default' : 'default'
        });
      } else {
        toast({
          title: 'Move Failed',
          description: 'No proposals were moved. Check the details below.',
          variant: 'destructive'
        });
      }

      logger.info('Bulk move completed', {
        successCount: moveResult.successCount,
        failureCount: moveResult.failureCount
      });

      return moveResult;
    } catch (error) {
      logger.error('Bulk move to onboarding failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      toast({
        title: 'Operation Failed',
        description: error instanceof Error ? error.message : 'Failed to move proposals to onboarding',
        variant: 'destructive'
      });

      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setResult(null);
  };

  return {
    moveToOnboarding,
    isProcessing,
    result,
    reset
  };
}
