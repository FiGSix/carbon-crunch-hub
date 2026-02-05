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
import { useState, useEffect } from "react";
import { QuickCalculatorModal } from "./solar-rewards/QuickCalculatorModal";
import { EligibilityModal } from "./solar-rewards/EligibilityModal";
 import { ImpactStats } from "./solar-rewards/ImpactStats";
 import { StickyCtaBar } from "@/components/solar-rewards/StickyCtaBar";

const SolarRewards = () => {
  const [showCalculator, setShowCalculator] = useState(false);
  const [showEligibility, setShowEligibility] = useState(false);

  useEffect(() => {
    // Set page title
    document.title = "For Home Owners - Monetize Your Solar System | Crunch Carbon Hub";
    
    // Set meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Turn your solar panels into a revenue stream. Earn cash, support charities, or access premium services by sharing your solar data. Check your eligibility and calculate potential earnings today.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Turn your solar panels into a revenue stream. Earn cash, support charities, or access premium services by sharing your solar data. Check your eligibility and calculate potential earnings today.';
      document.head.appendChild(meta);
    }

    // Set meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute('content', 'solar rewards, monetize solar panels, solar data, home owners, solar system earnings, carbon credits, solar investment');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'keywords';
      meta.content = 'solar rewards, monetize solar panels, solar data, home owners, solar system earnings, carbon credits, solar investment';
      document.head.appendChild(meta);
    }

    // Set Open Graph tags for social sharing
    const updateOrCreateOGTag = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (tag) {
        tag.setAttribute('content', content);
      } else {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        tag.setAttribute('content', content);
        document.head.appendChild(tag);
      }
    };

    updateOrCreateOGTag('og:title', 'For Home Owners - Monetize Your Solar System');
    updateOrCreateOGTag('og:description', 'Turn your solar panels into a revenue stream. Earn cash, support charities, or access premium services.');
    updateOrCreateOGTag('og:type', 'website');

    // Cleanup function to restore default title when component unmounts
    return () => {
      document.title = 'Crunch Carbon Hub';
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <HeroSection onCTAClick={() => setShowCalculator(true)} />
         <ImpactStats />
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
       
       <StickyCtaBar onCTAClick={() => setShowCalculator(true)} />
    </div>
  );
};

export default SolarRewards;
