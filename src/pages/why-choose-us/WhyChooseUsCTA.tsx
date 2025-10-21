import { SafeMotionDiv } from "@/components/common/SafeMotionDiv";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calculator } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const WhyChooseUsCTA = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-crunch-yellow/20 to-crunch-yellow/5">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-8"
        >
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-crunch-black">
              Ready to Get Rewarded?
            </h2>
            <p className="text-lg md:text-xl text-crunch-black/70 max-w-2xl mx-auto">
              Don't leave your carbon offsetting strategy to chance. Work with Crunch Carbon to ensure your investment 
              contributes to a sustainable future and aligns with global best practices.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <SafeMotionDiv whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => navigate("/calculator")}
                className="bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black font-semibold text-lg py-6 px-8 rounded-xl shadow-md hover:shadow-lg w-full sm:w-auto group"
                size="lg"
              >
                <Calculator className="mr-2 h-5 w-5" />
                Calculate Your Potential
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </SafeMotionDiv>

            <SafeMotionDiv whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => navigate("/register")}
                variant="outline"
                className="border-2 border-crunch-black/20 hover:bg-white hover:border-crunch-yellow text-crunch-black font-semibold text-lg py-6 px-8 rounded-xl w-full sm:w-auto"
                size="lg"
              >
                Get Started Today
              </Button>
            </SafeMotionDiv>
          </div>

          <div className="pt-4">
            <p className="text-sm text-crunch-black/60">
              🚀 Sign up & get an explainer email. Register for our program and start getting rewarded.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
