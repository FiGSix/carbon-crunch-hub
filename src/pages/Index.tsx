
import React from "react";
import { HeroSection } from "@/pages/home/HeroSection";
import { HowItWorksSection } from "@/pages/home/HowItWorksSection";
import { TestimonialsSection } from "@/pages/home/TestimonialsSection";
import { SocialProofSection } from "@/pages/home/SocialProofSection";
import { CTASection } from "@/pages/home/CTASection";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/Header";

const Index = () => {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <SocialProofSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
};

export default Index;
