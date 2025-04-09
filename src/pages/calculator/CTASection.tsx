
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface CTASectionProps {
  navigate: (path: string) => void;
}

export const CTASection = ({ navigate }: CTASectionProps) => {
  return (
    <section className="py-16 bg-gradient-to-br from-crunch-yellow/20 to-crunch-yellow/5">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-crunch-black">
            Ready to Turn Your Solar Power Into Profit?
          </h2>
          <p className="text-xl text-crunch-black/80 mb-10 max-w-2xl mx-auto">
            Don't leave money on the table. Sign up now to unlock the full potential of your solar system and start earning from your carbon credits.
          </p>
          
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-block"
          >
            <Button 
              onClick={() => navigate("/register")}
              className="bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black px-8 py-6 text-lg rounded-xl group"
              size="lg"
            >
              Get Started Now <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
