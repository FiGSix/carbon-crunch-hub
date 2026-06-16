import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Calculator, ArrowRight, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SafeMotionDiv } from "@/components/common/SafeMotionDiv";

export function CalculatorPromo() {
  const navigate = useNavigate();

  return (
    <section className="py-16 bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="meta-card rounded-3xl p-8 md:p-12 text-center relative overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full -mr-24 -mt-24" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full -ml-16 -mb-16" />
          
          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="inline-flex items-center justify-center p-4 rounded-2xl bg-primary/10 mb-6"
            >
              <Zap className="h-10 w-10 text-primary" />
            </motion.div>

            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              See What Your Solar System Could Earn
            </h2>
            
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Enter your system size and get an instant estimate. 
              Most homeowners are surprised by the numbers.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <SafeMotionDiv whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => navigate("/calculator")}
                  size="lg"
                  className="text-lg py-6 px-8 rounded-2xl shadow-sm hover:shadow-lg group"
                >
                  <Calculator className="mr-2 h-5 w-5" />
                  Calculate Now
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </SafeMotionDiv>
            </div>

            <p className="text-sm text-muted-foreground mt-6">
              Free • Takes 30 seconds • No signup required
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
