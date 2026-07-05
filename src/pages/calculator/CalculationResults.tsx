import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { CalendarDays, Mail, CheckCircle2, Loader2 } from "lucide-react";
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
import { useSendCalculatorResults } from "@/hooks/calculator/useCalculatorResults";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { ResultsShareCTA } from "@/components/referral/ResultsShareCTA";

interface CalculationResultsProps {
  results: ICalculationResults;
  systemSize: number;
  commissioningDate: Date;
  onReset: () => void;
  hideActions?: boolean;
}

export const CalculationResults = ({ 
  results, 
  systemSize,
  commissioningDate,
  onReset,
  hideActions = false
}: CalculationResultsProps) => {
  const [revenueData, setRevenueData] = useState<Record<string, number>>({});
  const [isLoadingRevenue, setIsLoadingRevenue] = useState(true);
  const [emailName, setEmailName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const sendResultsMutation = useSendCalculatorResults();
  
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
    <div className="meta-card p-4 md:p-6 lg:p-8">
      <h2 className="text-xl md:text-2xl font-bold text-center mb-4 md:mb-6 text-crunch-black">
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
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 md:mb-8">
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
      
      <ResultsShareCTA />

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
      
      {!hideActions && (
        <>
          {/* Optional email report */}
          <div className="mb-6 p-4 md:p-5 bg-white/50 rounded-xl border border-crunch-black/10">
            {emailSent ? (
              <div className="flex items-center gap-3 text-crunch-black">
                <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                <div>
                  <p className="font-medium">Report sent to {emailAddress}</p>
                  <p className="text-xs text-crunch-black/60">
                    The link is valid for 10 days. Check your spam folder if you don't see it.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-2 mb-3">
                  <Mail className="h-5 w-5 text-crunch-black/70 mt-0.5" />
                  <div>
                    <p className="font-medium text-crunch-black">
                      Want the full report emailed to you too?
                    </p>
                    <p className="text-xs text-crunch-black/60">
                      Optional — your Rand estimate above is complete already.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  <Input
                    type="text"
                    placeholder="Your name"
                    value={emailName}
                    onChange={(e) => setEmailName(e.target.value)}
                    className="retro-input"
                  />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className="retro-input"
                  />
                </div>
                <Button
                  onClick={async () => {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailAddress || !emailRegex.test(emailAddress)) {
                      toast.error("Please enter a valid email address");
                      return;
                    }
                    if (!emailName.trim()) {
                      toast.error("Please enter your name");
                      return;
                    }
                    try {
                      const referralCode = localStorage.getItem("referralCode");
                      await sendResultsMutation.mutateAsync({
                        email: emailAddress.trim(),
                        name: emailName.trim(),
                        systemSizeKwp: systemSize,
                        commissioningDate: format(commissioningDate, "yyyy-MM-dd"),
                        referralCode: referralCode || undefined,
                      });
                      setEmailSent(true);
                      toast.success("Report sent — check your inbox!");
                    } catch (error) {
                      logger.error("Failed to send calculator email", { error });
                      toast.error("Failed to send report. Please try again.");
                    }
                  }}
                  disabled={sendResultsMutation.isPending}
                  variant="outline"
                  size="sm"
                  className="border-crunch-black/30 text-crunch-black hover:bg-crunch-black/5"
                >
                  {sendResultsMutation.isPending ? (
                    <span className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Mail className="mr-2 h-4 w-4" />
                      Email me the full report
                    </span>
                  )}
                </Button>
              </>
            )}
          </div>

          <div className="flex justify-center flex-wrap gap-2">
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
              className="text-crunch-black/70"
            >
              Reset Calculator
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
