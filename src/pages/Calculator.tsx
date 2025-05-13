
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/footer";
import { useNavigate } from "react-router-dom";

// Import refactored components
import { HeroSection } from "./calculator/HeroSection";
import { CalculatorForm } from "./calculator/CalculatorForm";
import { CalculationResults } from "./calculator/CalculationResults";
import { FeaturesSection } from "./calculator/FeaturesSection";
import { CTASection } from "./calculator/CTASection";
import { CalculationResults as ICalculationResults } from "@/lib/calculations/carbon";

const Calculator = () => {
  const navigate = useNavigate();
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<ICalculationResults | null>(null);
  const [systemSize, setSystemSize] = useState<number>(0);
  const [commissioningDate, setCommissioningDate] = useState<Date>(new Date());
  
  const handleResultsCalculated = (
    calculationResults: ICalculationResults, 
    size: number, 
    date: Date
  ) => {
    setResults(calculationResults);
    setSystemSize(size);
    setCommissioningDate(date);
    setShowResults(true);
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <HeroSection />
        
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 max-w-6xl">
            {!showResults ? (
              <CalculatorForm 
                onResultsCalculated={handleResultsCalculated} 
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="order-2 lg:order-1 lg:col-span-2">
                  <CalculationResults 
                    results={results!} 
                    systemSize={systemSize}
                    commissioningDate={commissioningDate}
                    onReset={() => setShowResults(false)}
                    onSignUp={() => navigate("/register")}
                  />
                </div>
              </div>
            )}
          </div>
        </section>
        
        <FeaturesSection />
        <CTASection navigate={navigate} />
      </main>
      
      <Footer />
    </div>
  );
};

export default Calculator;
