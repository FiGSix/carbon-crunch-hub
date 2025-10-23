
import { Skeleton } from "@/components/ui/skeleton";
import { CarbonCreditTableWrapper } from "./carbon/CarbonCreditTableWrapper";
import { calculateAnnualEnergy, calculateCarbonCredits, normalizeToKWp } from "@/lib/calculations/carbon";
import { 
  calculateTotalMWhGenerated, 
  calculateTotalCarbonCredits
} from "./carbon/carbonCalculations";
import { usePortfolioData } from "./carbon/hooks/usePortfolioData";
import { useRevenueCalculations } from "./carbon/hooks/useRevenueCalculations";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef } from "react";

interface CarbonCreditSectionProps {
  systemSize: string;
  commissionDate?: string;
  selectedClientId?: string | null;
  proposalId?: string | null;
}

export function CarbonCreditSection({ systemSize, commissionDate, selectedClientId, proposalId }: CarbonCreditSectionProps) {
  const { portfolioData, loading: portfolioLoading } = usePortfolioData({
    selectedClientId,
    systemSize,
    proposalId
  });

  const { 
    calculationResult,
    clientSpecificRevenue, 
    loading: revenueLoading, 
    systemSizeKWp 
  } = useRevenueCalculations({
    systemSize,
    commissionDate,
    portfolioData,
    proposalId
  });

  const loading = portfolioLoading || revenueLoading;

  // Extract multi-phase data
  const isMultiPhase = calculationResult?.isMultiPhase || false;
  const phases = calculationResult?.phases || [];

  // Use client-specific revenue for display (this is what the client actually gets)
  const displayRevenue = clientSpecificRevenue;

  // Calculate totals using helper functions
  const totalMWhGenerated = calculateTotalMWhGenerated(systemSizeKWp, displayRevenue, commissionDate);
  const totalCarbonCredits = calculateTotalCarbonCredits(systemSizeKWp, displayRevenue, commissionDate);
  const totalClientSpecificRevenue = Object.values(clientSpecificRevenue).reduce((sum: number, val: number) => sum + val, 0);

  // Persist totalClientRevenue to proposal when calculated
  const lastSavedRevenue = useRef<number | null>(null);
  
  useEffect(() => {
    const persistRevenue = async () => {
      if (!proposalId || !totalClientSpecificRevenue || loading) return;
      
      const roundedRevenue = Math.round(totalClientSpecificRevenue);
      
      // Only update if value has changed
      if (lastSavedRevenue.current === roundedRevenue) return;
      
      try {
        const { data: currentProposal } = await supabase
          .from('proposals')
          .select('content')
          .eq('id', proposalId)
          .single();
        
        if (!currentProposal) return;
        
        const content = currentProposal.content as any;
        const currentRevenue = content?.financials?.totalClientRevenue;
        
        // Skip if already set to the same value
        if (currentRevenue === roundedRevenue) {
          lastSavedRevenue.current = roundedRevenue;
          return;
        }
        
        // Update the proposal with the calculated revenue
        await supabase
          .from('proposals')
          .update({
            content: {
              ...(typeof content === 'object' ? content : {}),
              financials: {
                ...(content?.financials || {}),
                totalClientRevenue: roundedRevenue
              }
            }
          })
          .eq('id', proposalId);
        
        lastSavedRevenue.current = roundedRevenue;
      } catch (error) {
        console.error('Failed to persist total client revenue:', error);
      }
    };
    
    persistRevenue();
  }, [proposalId, totalClientSpecificRevenue, loading]);

  if (loading) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Carbon Credit Projection</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Calculate inline summary data  
  const annualEnergy = calculateAnnualEnergy(systemSizeKWp);
  const carbonCredits = calculateCarbonCredits(systemSizeKWp);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Carbon Credit Projection</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-carbon-gray-500">Estimated Annual Energy</p>
          <p className="font-medium">{annualEnergy.toLocaleString()} kWh</p>
        </div>
        <div>
          <p className="text-sm text-carbon-gray-500">Estimated Annual Carbon Credits</p>
          <p className="font-medium">{carbonCredits.toFixed(2)} tCO₂</p>
        </div>
      </div>
      
      <h4 className="font-medium text-carbon-gray-700 mb-2">Client Revenue by Year</h4>
      
      <CarbonCreditTableWrapper
        isMultiPhase={isMultiPhase}
        phases={phases}
        consolidatedRevenue={displayRevenue}
        systemSizeKWp={systemSizeKWp}
        commissionDate={commissionDate}
        portfolioSize={portfolioData?.totalKWp || systemSizeKWp}
        totalMWhGenerated={totalMWhGenerated}
        totalCarbonCredits={totalCarbonCredits}
        totalClientSpecificRevenue={totalClientSpecificRevenue}
      />
      
      {commissionDate && (
        <p className="text-xs text-carbon-gray-500 mt-2">
          * Values for commissioning year are pro-rated based on the commission date
        </p>
      )}
    </div>
  );
}
