
import { motion } from "framer-motion";

export const HeroSection = () => {
  return (
    <section className="bg-gradient-to-br from-white to-crunch-yellow/5 py-20 md:py-28 overflow-hidden">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-4xl mx-auto"
        >
          <span className="inline-block px-4 py-2 bg-white/70 backdrop-blur-md rounded-full shadow-md border border-white/40 shadow-black/30 mb-6">
            <span className="text-sm font-medium text-crunch-black/70">Interactive Estimator</span>
          </span>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-crunch-black leading-tight tracking-tight mb-6">
            Crunch Carbon's <span className="text-crunch-yellow drop-shadow-sm">Carbon Credit Calculator</span>
          </h1>
          
          <p className="text-xl text-crunch-black/80 mb-10">
            Discover how much your solar installation could earn in carbon credits. Enter your system details and we'll show you the impact and potential value.
          </p>
        </motion.div>
      </div>
    </section>
  );
};
