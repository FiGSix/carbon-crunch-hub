
import { motion } from "framer-motion";
import { Leaf, BarChart3, Zap } from "lucide-react";

export const HowItWorksSection = () => {
  return (
    <section className="py-20" id="how-it-works">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-crunch-black">
              Turn Your Energy Into Income
            </h2>
            <p className="text-xl text-crunch-black/70 max-w-3xl mx-auto">
              Our platform automates everything, so you can sit back and watch your green energy create green dollars.
            </p>
          </motion.div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<Leaf className="h-8 w-8 text-green-600" />}
            iconBg="bg-green-100"
            iconHoverBg="bg-green-200"
            title="1. Quick Registration"
            description="Answer a few questions about your renewable energy system. We'll verify its eligibility in minutes, not weeks."
            delay={0.1}
          />
          
          <FeatureCard 
            icon={<BarChart3 className="h-8 w-8 text-blue-600" />}
            iconBg="bg-blue-100"
            iconHoverBg="bg-blue-200"
            title="2. Automatic Tracking"
            description="Our system monitors your energy production and automatically converts it into verified carbon credits."
            delay={0.2}
          />
          
          <FeatureCard 
            icon={<Zap className="h-8 w-8 text-crunch-yellow" />}
            iconBg="bg-yellow-100"
            iconHoverBg="bg-yellow-200"
            title="3. Regular Payouts"
            description="Receive quarterly deposits directly to your bank account. No hassle, no complicated paperwork, just income."
            delay={0.3}
          />
        </div>
      </div>
    </section>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  iconBg: string;
  iconHoverBg: string;
  title: string;
  description: string;
  delay: number;
}

const FeatureCard = ({ icon, iconBg, iconHoverBg, title, description, delay }: FeatureCardProps) => {
  return (
    <motion.div 
      className="group"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5 }}
    >
      <div className="bg-white p-8 rounded-lg shadow-md border border-crunch-black/10 h-full transition-all group-hover:shadow-lg">
        <div className={`rounded-full ${iconBg} p-4 inline-block mb-6 group-hover:${iconHoverBg} transition-colors`}>
          {icon}
        </div>
        <h3 className="text-xl font-bold mb-4 text-crunch-black">
          {title}
        </h3>
        <p className="text-crunch-black/70">
          {description}
        </p>
      </div>
    </motion.div>
  );
};
