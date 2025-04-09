
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/footer";
import { useIsMobile } from "@/hooks/use-mobile";
import { HeroSection } from "./home/HeroSection";
import { SocialProofSection } from "./home/SocialProofSection";
import { HowItWorksSection } from "./home/HowItWorksSection";
import { TestimonialsSection } from "./home/TestimonialsSection";
import { CTASection } from "./home/CTASection";

const Index = () => {
  const isMobile = useIsMobile();
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <HeroSection />
        <SocialProofSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
