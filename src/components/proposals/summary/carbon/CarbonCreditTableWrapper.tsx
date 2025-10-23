import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { CarbonCreditTable } from "./CarbonCreditTable";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PhaseRevenue } from "@/services/calculations/carbon/types";
import { 
  aggregateYearlyMWhFromPhases,
  aggregateYearlyCarbonCreditsFromPhases
} from "./carbonCalculations";

interface CarbonCreditTableWrapperProps {
  isMultiPhase: boolean;
  phases: PhaseRevenue[];
  consolidatedRevenue: Record<string, number>;
  systemSizeKWp: number;
  commissionDate?: string;
  portfolioSize: number;
  totalMWhGenerated: number;
  totalCarbonCredits: number;
  totalClientSpecificRevenue: number;
}

export function CarbonCreditTableWrapper({
  isMultiPhase,
  phases,
  consolidatedRevenue,
  systemSizeKWp,
  commissionDate,
  portfolioSize,
  totalMWhGenerated,
  totalCarbonCredits,
  totalClientSpecificRevenue
}: CarbonCreditTableWrapperProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Single-phase: Show table directly
  if (!isMultiPhase || phases.length === 0) {
    return (
      <CarbonCreditTable
        revenue={consolidatedRevenue}
        systemSizeKWp={systemSizeKWp}
        commissionDate={commissionDate}
        portfolioSize={portfolioSize}
        totalMWhGenerated={totalMWhGenerated}
        totalCarbonCredits={totalCarbonCredits}
        totalClientSpecificRevenue={totalClientSpecificRevenue}
        isPhaseTable={false}
      />
    );
  }

  // Helper function to calculate phase totals
  const calculatePhaseTotalMWh = (phase: PhaseRevenue) => {
    return Object.values(phase.revenueByYear).length * (phase.annualEnergyKwh / 1000);
  };

  const calculatePhaseTotalCredits = (phase: PhaseRevenue) => {
    return phase.carbonCreditsPerYear * Object.values(phase.revenueByYear).length;
  };

  const calculatePhaseTotalRevenue = (phase: PhaseRevenue) => {
    return Object.values(phase.revenueByYear).reduce((sum, val) => sum + val, 0);
  };

  // Multi-phase: Collapsible UI
  return (
    <div>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between mb-4 hover:bg-muted"
          >
            <span className="text-sm font-medium">
              {isExpanded ? 'Hide' : 'View'} Phase Breakdown ({phases.length} Phases)
            </span>
            <ChevronDown 
              className={`h-4 w-4 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`} 
            />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="space-y-6 mb-6">
            {phases.map((phase) => (
              <div key={phase.phaseNumber} className="border border-border rounded-lg p-4 bg-muted/30">
                <h5 className="font-semibold mb-3 text-foreground">
                  Phase {phase.phaseNumber}{phase.phaseName ? `: ${phase.phaseName}` : ''}
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({phase.sizeKWp.toFixed(2)} kWp)
                  </span>
                </h5>
                <CarbonCreditTable
                  revenue={phase.revenueByYear}
                  systemSizeKWp={phase.sizeKWp}
                  commissionDate={phase.commissionDate}
                  portfolioSize={portfolioSize}
                  totalMWhGenerated={calculatePhaseTotalMWh(phase)}
                  totalCarbonCredits={calculatePhaseTotalCredits(phase)}
                  totalClientSpecificRevenue={calculatePhaseTotalRevenue(phase)}
                  isPhaseTable={true}
                />
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
      
      <div className="border-t-2 border-primary/20 pt-6 mt-6">
        <h5 className="font-semibold mb-3 text-foreground">
          Consolidated Total (All Phases)
        </h5>
        <CarbonCreditTable
          revenue={consolidatedRevenue}
          systemSizeKWp={systemSizeKWp}
          commissionDate={commissionDate}
          portfolioSize={portfolioSize}
          totalMWhGenerated={totalMWhGenerated}
          totalCarbonCredits={totalCarbonCredits}
          totalClientSpecificRevenue={totalClientSpecificRevenue}
          preCalculatedYearlyMWh={aggregateYearlyMWhFromPhases(phases, Object.keys(consolidatedRevenue))}
          preCalculatedYearlyCredits={aggregateYearlyCarbonCreditsFromPhases(phases, Object.keys(consolidatedRevenue))}
          isPhaseTable={false}
        />
      </div>
    </div>
  );
}
