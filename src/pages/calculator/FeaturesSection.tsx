
import { motion } from "framer-motion";
import { BarChart3, TreePine, CircleDollarSign, LucideProps } from "lucide-react";
import { FeatureCard } from "./FeatureCard";

export const FeaturesSection = () => {
  return (
    <section className="py-16 bg-gradient-to-br from-crunch-yellow/5 to-white">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-crunch-black mb-4">
            Why Calculate Your Carbon Impact?
          </h2>
          <p className="text-lg text-crunch-black/70 max-w-2xl mx-auto">
            Understanding your solar system's environmental benefits is just the first step toward unlocking its full value.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            title="Quantify Your Impact" 
            description="Visualize exactly how much carbon you're preventing from entering the atmosphere with your solar installation."
            icon={BarChart3}
          />
          
          <FeatureCard 
            title="Discover Credit Potential" 
            description="Learn how your clean energy generation can be converted into valuable carbon credits that you can monetize."
            icon={TreePine}
          />
          
          <FeatureCard 
            title="Unlock New Revenue" 
            description="Your solar system isn't just saving you money on electricity—it could be generating an additional income stream."
            icon={CircleDollarSign}
          />
        </div>
      </div>
    </section>
  );
};
