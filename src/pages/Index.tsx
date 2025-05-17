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
        
        <div className="py-4 bg-gray-50 border-t">
          <div className="container mx-auto text-center text-sm">
            <p className="text-gray-500 mb-2">Developer Tools</p>
            <div className="flex justify-center gap-4">
              <a href="/test-login-flow" className="text-crunch-yellow hover:underline">
                Test Login Flow
              </a>
              <a href="/test-agent" className="text-crunch-yellow hover:underline">
                Test Agent Creation
              </a>
              <a href="/test-invitations" className="text-crunch-yellow hover:underline">
                Test Invitations
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Index;
