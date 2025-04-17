
import React from "react";
import { HeroSection } from "@/pages/home/HeroSection";
import { HowItWorksSection } from "@/pages/home/HowItWorksSection";
import { TestimonialsSection } from "@/pages/home/TestimonialsSection";
import { SocialProofSection } from "@/pages/home/SocialProofSection";
import { CTASection } from "@/pages/home/CTASection";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/Header";

export default function Index() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <SocialProofSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
