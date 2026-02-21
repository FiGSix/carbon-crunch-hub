import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickCalcForm } from "@/components/quick-calc/QuickCalcForm";
import { QuickCalcResults } from "@/components/quick-calc/QuickCalcResults";

export interface QuickCalcInputs {
  province: string;
  systemSizeKwp: number;
  commissionDate: Date;
}

export interface QuickCalcResult {
  annualEnergyKwh: number;
  carbonCreditsPerYear: number;
  revenueByYear: Record<string, number>;
  systemSizeKwp: number;
  commissionDate: Date;
  province: string;
  yieldFactor: number;
}

const QuickCalc = () => {
  const navigate = useNavigate();
  const [result, setResult] = useState<QuickCalcResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = async (inputs: QuickCalcInputs) => {
    setIsCalculating(true);
    
    // Simulate brief calculation delay for UX
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const { province, systemSizeKwp, commissionDate } = inputs;

    // Import calculation services dynamically
    const { UnifiedCarbonService, calculateRevenueByYear, getYieldForProvince } = await import('@/services/calculations/carbon');
    
    // Get regional yield factor for the selected province
    const yieldFactor = await getYieldForProvince(province);
    
    // Calculate using regional yield and first-time client tier (60.20% share)
    const annualEnergyKwh = UnifiedCarbonService.calculateAnnualEnergy(systemSizeKwp, yieldFactor);
    const carbonCreditsPerYear = UnifiedCarbonService.calculateCarbonCredits(systemSizeKwp, yieldFactor);
    const clientSharePercentage = UnifiedCarbonService.getClientSharePercentage(0); // First-time client
    
    // Calculate revenue by year
    const revenueByYear = await calculateRevenueByYear(
      carbonCreditsPerYear,
      clientSharePercentage,
      commissionDate
    );

    setResult({
      annualEnergyKwh,
      carbonCreditsPerYear,
      revenueByYear,
      systemSizeKwp,
      commissionDate,
      province,
      yieldFactor,
    });
    
    setIsCalculating(false);
  };

  const handleReset = () => {
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Quick Calc</h1>
          <p className="text-muted-foreground text-lg">
            Get instant revenue estimates for your clients
          </p>
        </div>

        {/* Form */}
        <QuickCalcForm 
          onCalculate={handleCalculate} 
          isCalculating={isCalculating}
          hasResults={!!result}
        />

        {/* Results */}
        {result && (
          <QuickCalcResults 
            result={result} 
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
};

export default QuickCalc;
