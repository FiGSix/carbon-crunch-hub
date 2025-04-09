
import { motion } from "framer-motion";

export const SocialProofSection = () => {
  return (
    <section className="border-y border-crunch-black/10 bg-crunch-black/5 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row gap-6 md:gap-0 justify-between items-center">
          <p className="text-crunch-black/80 font-medium">Trusted by homeowners across the country</p>
          <div className="flex gap-8 items-center">
            <div className="text-center">
              <motion.div 
                className="text-2xl font-bold text-crunch-black"
                whileHover={{ scale: 1.1 }}
              >
                3,500+
              </motion.div>
              <div className="text-sm text-crunch-black/70">Solar systems</div>
            </div>
            <div className="text-center">
              <motion.div 
                className="text-2xl font-bold text-crunch-black"
                whileHover={{ scale: 1.1 }}
              >
                $1.2M+
              </motion.div>
              <div className="text-sm text-crunch-black/70">Revenue generated</div>
            </div>
            <div className="text-center">
              <motion.div 
                className="text-2xl font-bold text-crunch-black"
                whileHover={{ scale: 1.1 }}
              >
                28,000+
              </motion.div>
              <div className="text-sm text-crunch-black/70">Tons CO₂ offset</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
