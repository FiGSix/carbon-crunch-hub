import { SafeMotionDiv } from "@/components/common/SafeMotionDiv";
import { Badge } from "@/components/ui/badge";
import { Shield, Award } from "lucide-react";

export const WhyChooseUsHero = () => {
  return (
    <section className="bg-gradient-to-br from-white to-crunch-yellow/5 py-16 md:py-24">
      <div className="container mx-auto px-4 max-w-6xl">
        <SafeMotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-6"
        >
          <Badge className="bg-crunch-yellow/20 text-crunch-black border-crunch-yellow/30 hover:bg-crunch-yellow/30">
            <Shield className="h-3 w-3 mr-1" />
            Verified & Trusted
          </Badge>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-crunch-black leading-tight">
            Choose the <span className="text-crunch-yellow">Right</span>
            <br />
            Carbon Partner
          </h1>

          <p className="text-lg md:text-xl text-crunch-black/70 max-w-3xl mx-auto">
            In South Africa's rapidly growing energy sector, choosing a trustworthy and qualified carbon partner is crucial. 
            Partnering with Verra or Gold Standard affiliated entities ensures compliance with international standards, 
            protecting you from financial losses and missed opportunities.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-4">
            <SafeMotionDiv
              whileHover={{ y: -5 }}
              className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-crunch-black/5"
            >
              <Award className="h-6 w-6 text-crunch-yellow" />
              <div className="text-left">
                <p className="text-sm font-medium text-crunch-black">Verra Verified</p>
                <p className="text-xs text-crunch-black/60">VCS Standard Certified</p>
              </div>
            </SafeMotionDiv>
            
            <SafeMotionDiv
              whileHover={{ y: -5 }}
              className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-crunch-black/5"
            >
              <Shield className="h-6 w-6 text-crunch-yellow" />
              <div className="text-left">
                <p className="text-sm font-medium text-crunch-black">CDSA Affiliated</p>
                <p className="text-xs text-crunch-black/60">Transparency Guaranteed</p>
              </div>
            </SafeMotionDiv>
          </div>
        </SafeMotionDiv>
      </div>
    </section>
  );
};
