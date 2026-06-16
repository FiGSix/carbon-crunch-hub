import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SafeMotionDiv } from "@/components/common/SafeMotionDiv";
import { ArrowRight } from "lucide-react";

export function MarketplaceCTA() {
  const navigate = useNavigate();

  return (
    <section className="py-16 md:py-24">
      <div className="container-responsive max-w-2xl mx-auto text-center">
        <SafeMotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl md:text-3xl font-bold text-crunch-black mb-4">
            Want early access?
          </h2>
          <p className="text-crunch-black/70 mb-8">
            Get in touch and we'll notify you when the marketplace launches.
          </p>
          <Button
            onClick={() => navigate("/contact")}
            className="bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black font-semibold rounded-full px-8 py-3 text-base shadow-sm hover:shadow group min-h-[44px]"
          >
            Get in Touch
            <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
          </Button>
        </SafeMotionDiv>
      </div>
    </section>
  );
}
