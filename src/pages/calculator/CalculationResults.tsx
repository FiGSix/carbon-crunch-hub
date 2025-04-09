
import { useState } from "react";
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
import { formatNumber } from "./utils";
import { CalculationResults as ICalculationResults, YearData } from "./types";

interface CalculationResultsProps {
  results: ICalculationResults;
  systemSize: number;
  commissioningDate: Date;
  onReset: () => void;
  onSignUp: () => void;
}

export const CalculationResults = ({ 
  results, 
  systemSize,
  commissioningDate,
  onReset,
  onSignUp
}: CalculationResultsProps) => {
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
      
      <div className="relative mb-8 overflow-hidden rounded-xl border border-crunch-black/10">
        <div className="absolute inset-0 z-10 bg-gradient-to-br from-transparent via-transparent to-white/70"></div>
        <div className="bg-white/50 backdrop-blur-sm p-4">
          <h3 className="text-sm font-medium text-crunch-black/70 mb-2">Estimated Carbon Credits</h3>
          <p className="text-2xl font-bold text-crunch-black mb-2">
            {formatNumber(results.carbonCredits)} <span className="text-sm font-normal">credits per year</span>
          </p>
          
          <div className="relative">
            <table className="w-full text-sm mt-4">
              <thead className="text-crunch-black/70 text-xs">
                <tr>
                  <th className="text-left pb-2">Year</th>
                  <th className="text-right pb-2">Energy (kWh)</th>
                  <th className="text-right pb-2">Carbon Offset (tonnes)</th>
                  <th className="text-right pb-2">Carbon Credits</th>
                </tr>
              </thead>
              <tbody>
                {results.yearsData.slice(0, 4).map((year) => (
                  <tr key={year.year} className="border-t border-crunch-black/5">
                    <td className="py-2 text-left font-medium">{year.year}</td>
                    <td className="py-2 text-right">{formatNumber(year.generation)}</td>
                    <td className="py-2 text-right">{formatNumber(year.carbonOffset)}</td>
                    <td className="py-2 text-right">{formatNumber(year.carbonCredits)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/90 to-transparent h-24 backdrop-blur-sm flex items-end justify-center p-4 z-20">
          <div className="text-center">
            <p className="font-medium text-crunch-black mb-3">
              💰 Want to see what that's worth?
            </p>
            <Button 
              onClick={onSignUp}
              className="bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black font-medium px-6"
            >
              Sign up to reveal your potential earnings
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="text-crunch-black/70">
              See Full Forecast (2025-2030)
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[540px]">
            <DialogHeader>
              <DialogTitle>Your Full Carbon Credit Forecast</DialogTitle>
              <DialogDescription>
                Projected credits from {format(commissioningDate, "dd MMM yyyy")} to 2030
              </DialogDescription>
            </DialogHeader>
            
            <div className="max-h-[400px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white text-crunch-black/70 text-xs">
                  <tr>
                    <th className="text-left p-2">Year</th>
                    <th className="text-right p-2">Energy (kWh)</th>
                    <th className="text-right p-2">Carbon Offset (tonnes)</th>
                    <th className="text-right p-2">Carbon Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {results.yearsData.map((year) => (
                    <tr key={year.year} className="border-t border-crunch-black/5">
                      <td className="p-2 text-left font-medium">{year.year}</td>
                      <td className="p-2 text-right">{formatNumber(year.generation)}</td>
                      <td className="p-2 text-right">{formatNumber(year.carbonOffset)}</td>
                      <td className="p-2 text-right">{formatNumber(year.carbonCredits)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <DialogFooter className="pt-4 border-t border-crunch-black/10">
              <p className="text-xs text-crunch-black/60 italic mr-auto">
                * Estimates are based on current carbon emission factors and may vary.
              </p>
              <Button
                onClick={onSignUp}
                className="bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black"
              >
                Sign Up to Reveal Value
              </Button>
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
