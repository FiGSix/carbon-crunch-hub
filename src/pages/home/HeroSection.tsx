
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Zap, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SafeMotionDiv } from "@/components/common/SafeMotionDiv";
import { OptimizedImage } from '@/components/ui/OptimizedImage';
export const HeroSection = () => {
  const navigate = useNavigate();
  
  // Diagnostic logging
  console.log("[HeroSection] Rendering hero section");
  
  return <section className="bg-gradient-to-br from-background to-accent py-16 md:py-24 overflow-hidden">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <SafeMotionDiv initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.5
        }} className="space-y-8">
            <SafeMotionDiv initial={{
            opacity: 0
          }} animate={{
            opacity: 1
          }} transition={{
            duration: 0.5,
            delay: 0.2
          }} className="inline-block px-4 py-2 bg-card/60 backdrop-blur-md rounded-full shadow-md border border-border/40">
              <span className="text-sm font-medium text-muted-foreground">Renewable Energy Monetised</span>
            </SafeMotionDiv>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight">
              <span className="text-foreground">Carbon Made</span>{" "}
              <span className="text-primary drop-shadow-sm">Simple</span>
            </h1>
            
            <p className="text-xl font-bold text-foreground max-w-xl">
              Your Launchpad for Lightning-Fast Carbon Proposals
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <SafeMotionDiv whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  onClick={() => navigate("/register")} 
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg py-6 px-8 w-full sm:w-auto rounded-2xl shadow-sm hover:shadow-lg group transition-all duration-300" 
                  size="lg"
                >
                  <span>Get Started</span> 
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </SafeMotionDiv>
              <SafeMotionDiv whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/calculator")} 
                  className="text-foreground text-lg py-6 px-8 w-full sm:w-auto rounded-2xl transition-all duration-300" 
                  size="lg"
                >
                  Calculate Your Potential
                </Button>
              </SafeMotionDiv>
            </div>
            
            <div className="flex items-center text-muted-foreground pt-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
              <span className="text-sm">Get setup in minutes. Proposals out like lightning.</span>
            </div>
          </SafeMotionDiv>
          
          <SafeMotionDiv className="hidden lg:block relative" initial={{
          opacity: 0,
          x: 20
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          duration: 0.5,
          delay: 0.2
        }}>
            <div className="relative">
              <div className="absolute -z-10 -right-4 -bottom-4 w-full h-full rounded-3xl bg-gradient-to-br from-primary/30 to-primary/10"></div>
              <div className="meta-card rounded-3xl p-6">
                <OptimizedImage
                  src="/lovable-uploads/9542096a-435e-4372-b09c-fb7cbaa80634-optimized.png" 
                  alt="CrunchCarbon Pac-Man Style Logo" 
                  className="w-full h-auto rounded-2xl transition-all hover:scale-105 duration-500"
                  width={488}
                  height={275}
                  priority={true}
                  fetchPriority="high"
                  sizes="(max-width: 768px) 100vw, 488px"
                  onLoad={() => console.log("[HeroSection] Logo image loaded successfully")}
                  onError={(e) => {
                    console.error("[HeroSection] Logo image failed to load:", e);
                    e.currentTarget.src = "/placeholder.svg";
                  }}
                />
              </div>
              
              {/* Floating elements */}
              <SafeMotionDiv 
                className="absolute -top-10 -left-10 meta-card p-3 rounded-2xl flex items-center gap-2" 
                animate={{ y: [0, -10, 0] }} 
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              >
                <Shield className="text-green-500 h-6 w-6" />
                <span className="font-medium text-foreground">Verified Green</span>
              </SafeMotionDiv>
              <SafeMotionDiv 
                className="absolute -bottom-5 -left-20 meta-card p-3 rounded-2xl flex items-center gap-2" 
                animate={{ y: [0, 10, 0] }} 
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
              >
                <Zap className="text-primary h-6 w-6" />
                <span className="font-medium text-foreground">Energy → Revenue</span>
              </SafeMotionDiv>
            </div>
          </SafeMotionDiv>
        </div>
      </div>
    </section>;
};
