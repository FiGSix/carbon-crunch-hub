import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { motion } from "framer-motion";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ResultCard } from "./ResultCard";
import { CalculationResults as ICalculationResults, YearData, formatNumber } from "@/lib/calculations/carbon";
import { CarbonCreditTable } from "@/components/proposals/summary/carbon/CarbonCreditTable";
import { calculateRevenueByYear } from "@/services/calculations/carbon/pricing";
import { logger } from "@/lib/logger";

interface CalculationResultsProps {
  results: ICalculationResults;
  systemSize: number;
  commissioningDate: Date;
  onReset: () => void;
}

export const CalculationResults = ({ 
  results, 
  systemSize,
  commissioningDate,
  onReset
}: CalculationResultsProps) => {
  const [revenueData, setRevenueData] = useState<Record<string, number>>({});
  const [isLoadingRevenue, setIsLoadingRevenue] = useState(true);
  
  // First-time client pricing configuration
  const portfolioSize = 0; // No existing portfolio
  const clientSharePercentage = 60.20; // Lowest tier (0-5MWp range)
  
  useEffect(() => {
    const loadRevenueData = async () => {
      try {
        setIsLoadingRevenue(true);
        const revenue = await calculateRevenueByYear(
          results.carbonCredits,
          clientSharePercentage,
          commissioningDate
        );
        setRevenueData(revenue);
      } catch (error) {
        logger.error("Error calculating revenue data", { error });
        setRevenueData({});
      } finally {
        setIsLoadingRevenue(false);
      }
    };
    
    loadRevenueData();
  }, [results.carbonCredits, commissioningDate]);
  
  // Calculate totals for the table
  const totalMWhGenerated = results.yearsData.reduce((sum, year) => sum + (year.generation / 1000), 0);
  const totalCarbonCredits = results.yearsData.reduce((sum, year) => sum + year.carbonCredits, 0);
  const totalClientSpecificRevenue = Object.values(revenueData).reduce((sum, val) => sum + val, 0);
  
  // Prepare pre-calculated yearly data for the table
  const preCalculatedYearlyMWh: Record<string, number> = {};
  const preCalculatedYearlyCredits: Record<string, number> = {};
  results.yearsData.forEach(year => {
    preCalculatedYearlyMWh[year.year.toString()] = year.generation / 1000; // Convert to MWh
    preCalculatedYearlyCredits[year.year.toString()] = year.carbonCredits;
  });
  
  return (
    <div className="meta-card p-8">
      <h2 className="text-2xl font-bold text-center mb-6 text-crunch-black">
        Your Solar Impact
      </h2>
      
      <div className="mb-6 p-4 bg-white/50 rounded-xl border border-crunch-black/10">
        <h3 className="text-sm font-medium text-crunch-black/70 mb-2">System Details</h3>
        <div className="flex justify-between">
          <p className="text-crunch-black font-medium">
            {systemSize} kWp Solar System
          </p>
          <p className="text-crunch-black/70 flex items-center">
            <CalendarDays className="h-4 w-4 mr-1" />
            Commissioned: {format(commissioningDate, "dd MMM yyyy")}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <ResultCard 
          title="Annual Energy" 
          value={formatNumber(results.annualGeneration)} 
          unit="kWh"
          description={`You'll generate approximately ${formatNumber(results.annualGeneration)} kWh of clean energy annually.`}
        />
        
        <ResultCard 
          title="Coal Avoided" 
          value={formatNumber(results.coalAvoided)} 
          unit="kg"
          description={`You've saved the planet from burning ${formatNumber(results.coalAvoided)} kg of coal!`}
        />
        
        <ResultCard 
          title="Carbon Impact" 
          value={formatNumber(results.carbonOffset)} 
          unit="tonnes CO₂"
          description={`That's like planting ${formatNumber(results.carbonOffset * 50)} trees!`}
        />
      </div>
      
      <div className="mb-8 overflow-hidden rounded-xl border border-crunch-black/10">
        <div className="bg-white/50 backdrop-blur-sm p-4">
          <h3 className="text-sm font-medium text-crunch-black/70 mb-4">Carbon Credit Revenue Projection</h3>
          <p className="text-xs text-crunch-black/60 mb-4">
            Based on first-time client pricing tier ({clientSharePercentage}% client share)
          </p>
          
          {isLoadingRevenue ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-crunch-black"></div>
            </div>
          ) : (
            <CarbonCreditTable
              revenue={revenueData}
              systemSizeKWp={systemSize}
              commissionDate={format(commissioningDate, "yyyy-MM-dd")}
              portfolioSize={portfolioSize}
              totalMWhGenerated={totalMWhGenerated}
              totalCarbonCredits={totalCarbonCredits}
              totalClientSpecificRevenue={totalClientSpecificRevenue}
              preCalculatedYearlyMWh={preCalculatedYearlyMWh}
              preCalculatedYearlyCredits={preCalculatedYearlyCredits}
            />
          )}
        </div>
      </div>
      
      <div className="flex justify-center">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="text-crunch-black/70">
              See Full Forecast (2025-2030)
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Your Full Carbon Credit Revenue Forecast</DialogTitle>
              <DialogDescription>
                Complete revenue projection from {format(commissioningDate, "dd MMM yyyy")} to 2030
              </DialogDescription>
            </DialogHeader>
            
            <div className="max-h-[500px] overflow-auto">
              {isLoadingRevenue ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-crunch-black"></div>
                </div>
              ) : (
                <CarbonCreditTable
                  revenue={revenueData}
                  systemSizeKWp={systemSize}
                  commissionDate={format(commissioningDate, "yyyy-MM-dd")}
                  portfolioSize={portfolioSize}
                  totalMWhGenerated={totalMWhGenerated}
                  totalCarbonCredits={totalCarbonCredits}
                  totalClientSpecificRevenue={totalClientSpecificRevenue}
                  preCalculatedYearlyMWh={preCalculatedYearlyMWh}
                  preCalculatedYearlyCredits={preCalculatedYearlyCredits}
                />
              )}
            </div>
            
            <DialogFooter className="pt-4 border-t border-crunch-black/10">
              <p className="text-xs text-crunch-black/60 italic">
                * Revenue projections based on first-time client pricing ({clientSharePercentage}% share). Carbon prices are dynamic and may vary.
              </p>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Button 
          variant="ghost" 
          onClick={onReset}
          className="ml-2 text-crunch-black/70"
        >
          Reset Calculator
        </Button>
      </div>
    </div>
  );
};
