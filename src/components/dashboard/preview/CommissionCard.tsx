
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { motion } from "framer-motion";
import { Percent } from "lucide-react";

interface CommissionCardProps {
  portfolioSize: number; // in MWp
}

export function CommissionCard({ portfolioSize }: CommissionCardProps) {
  // Calculate commission rate based on portfolio size
  const commissionRate = portfolioSize >= 15 ? 7 : 4;
  
  // Calculate progress towards next tier (as percentage)
  const progress = portfolioSize >= 15 ? 100 : (portfolioSize / 15) * 100;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
    >
      <Card className="overflow-hidden border border-crunch-black/5 bg-white shadow-sm hover:shadow-md transition-all duration-300">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-crunch-black/70">Commission</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="space-y-1">
              <div className="text-2xl font-bold">{commissionRate}%</div>
              <div className="text-xs text-crunch-black/50">
                {portfolioSize < 15 ? `${(15 - portfolioSize).toFixed(1)} MWp to 7%` : "Maximum rate achieved"}
              </div>
            </div>
            <div className="rounded-full bg-purple-100 p-3 shadow-sm">
              <Percent className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-2.5 mt-2">
            <motion.div 
              className="bg-purple-600 h-2.5 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-crunch-black/50">
            <span>4%</span>
            <span>7%</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
