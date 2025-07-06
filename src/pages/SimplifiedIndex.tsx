import React from "react";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { DisplayDiagnostics } from "@/components/diagnostics/DisplayDiagnostics";
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
  console.log("[SimplifiedIndex] Starting to render simplified index page");
  
  try {
    return (
      <>
        <DisplayDiagnostics />
        <Header />
        <main>
          <ErrorBoundary
            fallback={
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-red-600 mb-4">Hero Section Error</h1>
                  <p>The hero section failed to render</p>
                </div>
              </div>
            }
          >
            <SimplifiedHeroSection />
          </ErrorBoundary>
          
          <ErrorBoundary
            fallback={
              <div className="py-20 text-center">
                <p>How It Works section failed to render</p>
              </div>
            }
          >
            <HowItWorksSection />
          </ErrorBoundary>
          
          <ErrorBoundary
            fallback={
              <div className="py-20 text-center">
                <p>Testimonials section failed to render</p>
              </div>
            }
          >
            <SimplifiedTestimonialsSection />
          </ErrorBoundary>
          
          <ErrorBoundary
            fallback={
              <div className="py-20 text-center">
                <p>Social Proof section failed to render</p>
              </div>
            }
          >
            <SocialProofSection />
          </ErrorBoundary>
          
          <ErrorBoundary
            fallback={
              <div className="py-20 text-center">
                <p>CTA section failed to render</p>
              </div>
            }
          >
            <CTASection />
          </ErrorBoundary>
        </main>
        <ErrorBoundary
          fallback={
            <div className="py-8 text-center">
              <p>Footer failed to render</p>
            </div>
          }
        >
          <Footer />
        </ErrorBoundary>
      </>
    );
  } catch (error) {
    console.error("[SimplifiedIndex] Critical error during render:", error);
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