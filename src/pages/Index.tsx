

import { HeroSection } from "@/pages/home/HeroSection";
import { AudienceSelector } from "@/components/home/AudienceSelector";
import { CalculatorPromo } from "@/components/home/CalculatorPromo";
import { HowItWorksSection } from "@/pages/home/HowItWorksSection";
import { SocialProofSection } from "@/pages/home/SocialProofSection";
import { TestimonialsSection } from "@/pages/home/TestimonialsSection";
import { SecuritySection } from "@/components/home/SecuritySection";
import { CTASection } from "@/pages/home/CTASection";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/Header";
import { StickyCtaBar } from "@/components/solar-rewards/StickyCtaBar";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <AudienceSelector />
        <CalculatorPromo />
        <HowItWorksSection />
        <SocialProofSection />
        <TestimonialsSection />
        <SecuritySection />
        <CTASection />
      </main>
      <Footer />
      <StickyCtaBar onCTAClick={() => navigate("/calculator")} />
    </>
  );
};

export default Index;
