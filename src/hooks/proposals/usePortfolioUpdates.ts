
import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

export const usePortfolioUpdates = () => {
  const { toast } = useToast();
  
  const portfolioLogger = logger.withContext({
    component: 'PortfolioUpdates',
    feature: 'portfolio-management'
  });

  const triggerPortfolioUpdate = useCallback((clientId?: string) => {
    portfolioLogger.info("Portfolio update triggered", { clientId });
    
    // Dispatch global event for portfolio updates
    window.dispatchEvent(new CustomEvent('proposal-status-changed', {
      detail: { 
        type: 'portfolio-update',
        clientId 
      }
    }));
    
    toast({
      title: "Portfolio Updated",
      description: "Client portfolio data has been refreshed.",
    });
  }, [toast, portfolioLogger]);

  return {
    triggerPortfolioUpdate
  };
};
