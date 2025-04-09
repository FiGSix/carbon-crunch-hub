
import { motion } from "framer-motion";
import { LucideProps } from "lucide-react";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.FC<LucideProps>;
}

export const FeatureCard = ({ title, description, icon: Icon }: FeatureCardProps) => {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white p-6 rounded-xl shadow-sm border border-crunch-black/5 transition-all hover:shadow-md"
    >
      <div className="w-12 h-12 rounded-full bg-crunch-yellow/20 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-crunch-yellow" />
      </div>
      <h3 className="text-xl font-bold mb-2 text-crunch-black">{title}</h3>
      <p className="text-crunch-black/70">{description}</p>
    </motion.div>
  );
};
