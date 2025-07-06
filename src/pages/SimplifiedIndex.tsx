import React from "react";
import { ProgressiveErrorBoundary } from "@/components/common/ProgressiveErrorBoundary";
import { DisplayDiagnostics } from "@/components/diagnostics/DisplayDiagnostics";
import { CSSFallbackDiagnostics } from "@/components/diagnostics/CSSFallbackDiagnostics";
import { SimplifiedHeroSection } from "@/pages/home/SimplifiedHeroSection";
import { HowItWorksSection } from "@/pages/home/HowItWorksSection";
import { SimplifiedTestimonialsSection } from "@/pages/home/SimplifiedTestimonialsSection";
import { SocialProofSection } from "@/pages/home/SocialProofSection";
import { CTASection } from "@/pages/home/CTASection";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/Header";

/**
 * Simplified Index page without complex animations for debugging
 */
const SimplifiedIndex = () => {
  // Development logging only
  if (import.meta.env.DEV) {
    console.log("[SimplifiedIndex] Starting to render simplified index page");
  }
  
  try {
    return (
      <>
        <DisplayDiagnostics />
        <CSSFallbackDiagnostics />
        <ProgressiveErrorBoundary level="page" name="Header">
          <Header />
        </ProgressiveErrorBoundary>
        <main>
          <ProgressiveErrorBoundary 
            level="section" 
            name="Hero Section"
            fallback={
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-primary mb-4">CrunchCarbon</h1>
                  <p className="text-xl text-muted-foreground">Carbon Made Simple</p>
                </div>
              </div>
            }
          >
            <SimplifiedHeroSection />
          </ProgressiveErrorBoundary>
          
          <ProgressiveErrorBoundary level="section" name="How It Works">
            <HowItWorksSection />
          </ProgressiveErrorBoundary>
          
          <ProgressiveErrorBoundary level="section" name="Testimonials">
            <SimplifiedTestimonialsSection />
          </ProgressiveErrorBoundary>
          
          <ProgressiveErrorBoundary level="section" name="Social Proof">
            <SocialProofSection />
          </ProgressiveErrorBoundary>
          
          <ProgressiveErrorBoundary level="section" name="CTA">
            <CTASection />
          </ProgressiveErrorBoundary>
        </main>
        <ProgressiveErrorBoundary level="section" name="Footer">
          <Footer />
        </ProgressiveErrorBoundary>
      </>
    );
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("[SimplifiedIndex] Critical error during render:", error);
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold text-destructive mb-4">Application Error</h1>
          <p className="text-muted-foreground mb-4">
            The application encountered a critical error during rendering.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
};

export default SimplifiedIndex;