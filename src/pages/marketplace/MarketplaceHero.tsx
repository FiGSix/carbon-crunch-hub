import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SafeMotionDiv } from "@/components/common/SafeMotionDiv";
import { ArrowRight } from "lucide-react";

export function MarketplaceHero() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-crunch-yellow/5 via-transparent to-crunch-yellow/10 pointer-events-none" />

      <div className="container-responsive relative z-10 text-center max-w-3xl mx-auto">
        <SafeMotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block bg-crunch-yellow/20 text-crunch-black font-semibold text-sm px-4 py-1.5 rounded-full mb-6 tracking-wide uppercase">
            Coming Soon
          </span>
        </SafeMotionDiv>

        <SafeMotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-crunch-black mb-6 leading-tight">
            The Crunch Carbon{" "}
            <span className="text-crunch-yellow">Marketplace</span>
          </h1>
        </SafeMotionDiv>

        <SafeMotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <p className="text-lg md:text-xl text-crunch-black/70 mb-10 max-w-2xl mx-auto">
            A dedicated platform to buy, sell, and trade verified carbon credits
            — transparently and efficiently.
          </p>
        </SafeMotionDiv>

        <SafeMotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Button
            onClick={() => navigate("/contact")}
            className="bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black font-semibold rounded-full px-8 py-3 text-base shadow-sm hover:shadow group min-h-[44px]"
          >
            Register Your Interest
            <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
          </Button>
        </SafeMotionDiv>
      </div>
    </section>
  );
}
