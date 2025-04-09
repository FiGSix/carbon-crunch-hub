
import { motion } from "framer-motion";

interface ResultCardProps {
  title: string;
  value: string;
  unit: string;
  description: string;
}

export const ResultCard = ({ title, value, unit, description }: ResultCardProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/80 p-4 rounded-xl border border-crunch-black/10 hover:shadow-md transition-all hover:-translate-y-1"
    >
      <h3 className="text-sm font-medium text-crunch-black/70 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-crunch-black mb-1">
        {value} <span className="text-sm font-normal">{unit}</span>
      </p>
      <p className="text-xs text-crunch-black/60">{description}</p>
    </motion.div>
  );
};
