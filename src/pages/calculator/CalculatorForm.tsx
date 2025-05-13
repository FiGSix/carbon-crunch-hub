import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calculator as CalculatorIcon, ArrowRight, Loader2 } from "lucide-react";
import { IconCard } from "./IconCard";
import { BarChart3, TreePine, CircleDollarSign } from "lucide-react";
import { CalculationResults, calculateResults } from "@/lib/calculations/carbon";

interface CalculatorFormProps {
  onResultsCalculated: (results: CalculationResults, systemSize: number, commissioningDate: Date) => void;
}

export const CalculatorForm = ({ onResultsCalculated }: CalculatorFormProps) => {
  const today = new Date();
  const [systemSize, setSystemSize] = useState<string>("");
  const [commissioningDate, setCommissioningDate] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  );
  const [isCalculating, setIsCalculating] = useState(false);
  
  const handleCalculate = () => {
    // Validate inputs
    if (!systemSize || !commissioningDate) return;
    
    const size = parseFloat(systemSize);
    if (isNaN(size) || size <= 0) return;
    
    const commDate = new Date(commissioningDate);
    const minDate = new Date("2025-01-01");
    
    // Don't show estimates earlier than Jan 1, 2025
    if (commDate < minDate) {
      commDate.setFullYear(2025);
      commDate.setMonth(0);
      commDate.setDate(1);
    }
    
    setIsCalculating(true);
    
    // Simulate calculation delay for better UX
    setTimeout(() => {
      const calculationResults = calculateResults(size, commDate);
      onResultsCalculated(calculationResults, size, commDate);
      setIsCalculating(false);
    }, 1500);
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="order-2 lg:order-1"
      >
        <div className="meta-card p-8 relative">
          <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-crunch-yellow/90 text-crunch-black font-medium px-4 py-2 rounded-full shadow-md">
            <span className="flex items-center">
              <CalculatorIcon className="mr-2 h-4 w-4" /> 
              Crunch the Numbers
            </span>
          </div>
          
          <h2 className="text-2xl font-bold text-center mb-6 text-crunch-black mt-2">
            Tell Us About Your Solar System
          </h2>
          
          <div className="space-y-6">
            <div>
              <label htmlFor="systemSize" className="block text-sm font-medium text-crunch-black/70 mb-1">
                System Size (kWp)
              </label>
              <Input
                id="systemSize"
                type="number"
                min="1"
                step="0.1"
                placeholder="e.g. 100"
                value={systemSize}
                onChange={(e) => setSystemSize(e.target.value)}
                className="retro-input text-lg"
              />
            </div>
            
            <div>
              <label htmlFor="commissioningDate" className="block text-sm font-medium text-crunch-black/70 mb-1">
                Commissioning Date
              </label>
              <Input
                id="commissioningDate"
                type="date"
                value={commissioningDate}
                min="2025-01-01"
                onChange={(e) => setCommissioningDate(e.target.value)}
                className="retro-input text-lg"
              />
            </div>
            
            <Button 
              onClick={handleCalculate}
              disabled={isCalculating || !systemSize || parseFloat(systemSize) <= 0}
              className="w-full bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black font-medium text-lg py-6 rounded-xl group transition-all hover:-translate-y-1 hover:shadow-lg disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {isCalculating ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
                  Crunching...
                </span>
              ) : (
                <span className="flex items-center">
                  CRUNCH IT! 
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="order-1 lg:order-2"
      >
        <div className="meta-card p-8 flex flex-col items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-2xl font-bold text-crunch-black mb-4">
              See How Your Solar Stacks Up
            </p>
            <p className="text-crunch-black/70">
              Enter your system details and hit "CRUNCH IT!" to discover your solar system's potential impact.
            </p>
            
            <div className="grid grid-cols-3 gap-4 mt-8">
              <IconCard 
                icon={BarChart3}
                title="Energy" 
                description="Calculate your solar energy generation"
              />
              <IconCard 
                icon={TreePine}
                title="Impact" 
                description="See your carbon offset equivalent"
              />
              <IconCard 
                icon={CircleDollarSign}
                title="Value" 
                description="Reveal potential earnings"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
