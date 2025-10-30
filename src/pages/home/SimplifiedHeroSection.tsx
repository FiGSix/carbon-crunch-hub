
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { OptimizedImage } from '@/components/ui/OptimizedImage';

/**
 * Simplified Hero Section without animations for debugging
 */
export const SimplifiedHeroSection = () => {
  const navigate = useNavigate();
  
  console.log("[SimplifiedHeroSection] Rendering simplified hero");
  
  return (
    <section className="bg-gradient-to-br from-background to-accent py-16 md:py-24">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-block px-4 py-2 bg-card/60 backdrop-blur-md rounded-full shadow-md border border-border/40">
              <span className="text-sm font-medium text-muted-foreground">Renewable Energy Monetised</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight">
              <span className="text-foreground">Carbon Made</span>{" "}
              <span className="text-primary drop-shadow-sm">Simple</span>
            </h1>
            
            <p className="text-xl font-bold text-foreground max-w-xl">
              Your Launchpad for Lightning-Fast Carbon Proposals
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button 
                onClick={() => navigate("/register")} 
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg py-6 px-8 w-full sm:w-auto rounded-2xl shadow-sm hover:shadow-lg group transition-all duration-300" 
                size="lg"
              >
                <span>Get Started</span> 
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate("/calculator")} 
                className="text-foreground text-lg py-6 px-8 w-full sm:w-auto rounded-2xl transition-all duration-300" 
                size="lg"
              >
                Calculate Your Potential
              </Button>
            </div>
            
            <div className="flex items-center text-muted-foreground pt-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
              <span className="text-sm">Get setup in minutes. Proposals out like lightning.</span>
            </div>
          </div>
          
          <div className="hidden lg:block relative">
            <div className="relative">
              <div className="absolute -z-10 -right-4 -bottom-4 w-full h-full rounded-3xl bg-gradient-to-br from-primary/30 to-primary/10"></div>
              <div className="meta-card rounded-3xl p-6">
                <OptimizedImage
                  src="/lovable-uploads/9542096a-435e-4372-b09c-fb7cbaa80634.png"
                  alt="CrunchCarbon Pac-Man Style Logo"
                  className="w-full h-auto rounded-2xl transition-all hover:scale-105 duration-500"
                  width={488}
                  height={275}
                  priority={true}
                  fetchPriority="high"
                  sizes="(max-width: 768px) 100vw, 488px"
                  onLoad={() => console.log("[SimplifiedHeroSection] Logo loaded")}
                  onError={(e) => {
                    console.error("[SimplifiedHeroSection] Logo failed to load");
                    e.currentTarget.src = "/placeholder.svg";
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};