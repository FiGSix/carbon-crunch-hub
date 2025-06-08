
import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export function usePortfolioUpdates() {
  const { toast } = useToast();

  const updatePortfolioPercentages = useCallback(async () => {
    try {
      // Portfolio updates are handled automatically in the simplified system
      toast({
        title: "Portfolio Updated",
        description: "Portfolio percentages are calculated automatically.",
      });
    } catch (error) {
      console.error('Portfolio update error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update portfolio percentages.",
        variant: "destructive",
      });
    }
  }, [toast]);

  return {
    updatePortfolioPercentages,
  };
}
