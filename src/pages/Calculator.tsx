import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/footer";
import { useNavigate, useSearchParams } from "react-router-dom";
import { dynamicCarbonPricingService } from "@/lib/calculations/carbon/dynamicPricing";
import { Helmet } from "react-helmet-async";

// Import refactored components
import { HeroSection } from "./calculator/HeroSection";
import { CalculatorForm } from "./calculator/CalculatorForm";
import { CalculationResults } from "./calculator/CalculationResults";
import { FeaturesSection } from "./calculator/FeaturesSection";
import { CTASection } from "./calculator/CTASection";
import { CalculationResults as ICalculationResults } from "@/lib/calculations/carbon";

const Calculator = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<ICalculationResults | null>(null);
  const [systemSize, setSystemSize] = useState<number>(0);
  const [commissioningDate, setCommissioningDate] = useState<Date>(new Date());
  
  // Lazy load carbon prices on mount
  useEffect(() => {
    dynamicCarbonPricingService.getCarbonPrices().catch(() => {
      // Silently fail - fallback constants will be used
    });
  }, []);
  
  // Capture referral code from URL and store in localStorage
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      localStorage.setItem('referralCode', refCode);
    }
  }, [searchParams]);
  
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
      <Helmet>
        <title>Solar Carbon Credit Calculator | Crunch Carbon</title>
        <meta name="description" content="Calculate your solar carbon credit earnings instantly. Free tool for South African homeowners and businesses." />
        <link rel="canonical" href="https://crunchcarbon.com/calculator" />
        <meta property="og:title" content="Solar Carbon Credit Calculator | Crunch Carbon" />
        <meta property="og:description" content="Calculate your solar carbon credit earnings instantly. Free tool for South African homeowners and businesses." />
        <meta property="og:url" content="https://crunchcarbon.com/calculator" />
        <meta property="og:type" content="website" />
      </Helmet>
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
