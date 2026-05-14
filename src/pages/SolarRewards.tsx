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
import { ImpactStats } from "./solar-rewards/ImpactStats";
import { StickyCtaBar } from "@/components/solar-rewards/StickyCtaBar";
import { FAQSection } from "./solar-rewards/FAQSection";
import { LiveActivityNotification } from "@/components/solar-rewards/LiveActivityNotification";
import { TestimonialsSection } from "./solar-rewards/TestimonialsSection";
import { Helmet } from "react-helmet-async";

const SolarRewards = () => {
  const [showCalculator, setShowCalculator] = useState(false);
  const [showEligibility, setShowEligibility] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Monetise Your Solar System | Crunch Carbon</title>
        <meta name="description" content="Turn your solar panels into a revenue stream. Earn cash, support charities, or access premium services by sharing your solar data." />
        <link rel="canonical" href="https://crunchcarbon.com/home-owners" />
        <meta property="og:title" content="Monetise Your Solar System | Crunch Carbon" />
        <meta property="og:description" content="Turn your solar panels into a revenue stream. Earn cash, support charities, or access premium services by sharing your solar data." />
        <meta property="og:url" content="https://crunchcarbon.com/home-owners" />
        <meta property="og:type" content="website" />
      </Helmet>
      <Header />
      
      <main className="flex-1">
        <HeroSection onCTAClick={() => setShowCalculator(true)} />
         
         <ImpactStats />
        <HowItWorks onCheckEligibility={() => setShowEligibility(true)} />
        <BenefitsSection />
        <ValueCards />
         <TestimonialsSection />
        <EarningsEstimator onCalculateClick={() => setShowCalculator(true)} />
        <QualificationSection onCheckEligibility={() => setShowEligibility(true)} />
         <FAQSection />
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
       
       <StickyCtaBar onCTAClick={() => setShowCalculator(true)} />
       
       <LiveActivityNotification />
    </div>
  );
};

export default SolarRewards;
