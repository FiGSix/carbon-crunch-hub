
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { updatePortfolioPercentages, validateAndFixPortfolioInconsistencies } from '@/services/proposals/portfolioUpdateService';
import { formatSystemSizeForDisplay } from '@/lib/calculations/carbon/normalization';
import { logger } from '@/lib/logger';

export function usePortfolioUpdates() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const portfolioLogger = logger.withContext({
    component: 'PortfolioUpdatesHook',
    feature: 'portfolio-management'
  });

  const updateClientPortfolio = useCallback(async (clientId: string) => {
    setLoading(true);
    
    try {
      portfolioLogger.info("Updating client portfolio", { clientId });
      
      const result = await updatePortfolioPercentages(clientId);
      
      if (result.success) {
        toast({
          title: "Portfolio Updated",
          description: `Updated ${result.updatedProposals} proposals for portfolio size of ${formatSystemSizeForDisplay(result.portfolioData.totalKWp)}`,
        });
        
        // Dispatch event to trigger proposal list refresh
        window.dispatchEvent(new CustomEvent('proposal-status-changed', {
          detail: { type: 'portfolio-update', clientId }
        }));
      } else {
        toast({
          title: "Portfolio Update Failed",
          description: result.error || "Failed to update portfolio percentages",
          variant: "destructive",
        });
      }
      
      return result;
    } catch (error) {
      portfolioLogger.error("Portfolio update error", { error });
      toast({
        title: "Update Error",
        description: "An unexpected error occurred while updating the portfolio",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast, portfolioLogger]);

  const validatePortfolios = useCallback(async () => {
    setLoading(true);
    
    try {
      portfolioLogger.info("Starting portfolio validation");
      
      const result = await validateAndFixPortfolioInconsistencies();
      
      if (result.errors.length === 0) {
        toast({
          title: "Portfolio Validation Complete",
          description: `Checked ${result.checked} portfolios, fixed ${result.fixed} inconsistencies`,
        });
      } else {
        toast({
          title: "Portfolio Validation Issues",
          description: `Found ${result.errors.length} errors while validating portfolios`,
          variant: "destructive",
        });
      }
      
      // Trigger global refresh
      window.dispatchEvent(new CustomEvent('proposal-status-changed', {
        detail: { type: 'portfolio-validation-complete' }
      }));
      
      return result;
    } catch (error) {
      portfolioLogger.error("Portfolio validation error", { error });
      toast({
        title: "Validation Error",
        description: "Failed to validate portfolio consistency",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast, portfolioLogger]);

  return {
    updateClientPortfolio,
    validatePortfolios,
    loading
  };
}
