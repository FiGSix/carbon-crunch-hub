import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "./solar-rewards/HeroSection";
import { HowItWorks } from "./solar-rewards/HowItWorks";
import { BenefitsSection } from "./solar-rewards/BenefitsSection";
import { ValueCards } from "./solar-rewards/ValueCards";
import { EarningsEstimator } from "./solar-rewards/EarningsEstimator";
import { QualificationSection } from "./solar-rewards/QualificationSection";
import { TrustSection } from "./solar-rewards/TrustSection";
import { FinalCTA } from "./solar-rewards/FinalCTA";
import { useState } from "react";
import { QuickCalculatorModal } from "./solar-rewards/QuickCalculatorModal";
import { EligibilityModal } from "./solar-rewards/EligibilityModal";

const SolarRewards = () => {
  const [showCalculator, setShowCalculator] = useState(false);
  const [showEligibility, setShowEligibility] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <HeroSection onCTAClick={() => setShowCalculator(true)} />
        <HowItWorks onCheckEligibility={() => setShowEligibility(true)} />
        <BenefitsSection />
        <ValueCards />
        <EarningsEstimator onCalculateClick={() => setShowCalculator(true)} />
        <QualificationSection onCheckEligibility={() => setShowEligibility(true)} />
        <TrustSection />
        <FinalCTA onCTAClick={() => setShowCalculator(true)} />
      </main>
      
      <Footer />
      
      <QuickCalculatorModal 
        open={showCalculator} 
        onOpenChange={setShowCalculator} 
      />
      
      <EligibilityModal 
        open={showEligibility} 
        onOpenChange={setShowEligibility}
        onQualified={() => {
          setShowEligibility(false);
          setShowCalculator(true);
        }}
      />
    </div>
  );
};

export default SolarRewards;
