
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { motion } from "framer-motion";
import { Percent } from "lucide-react";
import { getAgentCommissionPercentage } from "@/lib/calculations/carbon";

interface CommissionCardProps {
  portfolioSize: number; // in kWp
}

export function CommissionCard({ portfolioSize }: CommissionCardProps) {
  // Use the carbon calculation library's function which handles unit conversion properly
  const commissionRate = getAgentCommissionPercentage(portfolioSize);
  
  // Calculate progress towards next tier (as percentage)
  // The threshold is 15,000 kWp (15 MWp) for 7% commission
  const progress = portfolioSize >= 15000 ? 100 : (portfolioSize / 15000) * 100;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="h-full"
    >
      <Card className="overflow-hidden border border-crunch-black/5 bg-white shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-crunch-black/70">Commission</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div className="space-y-1">
              <div className="text-2xl font-bold">{commissionRate}%</div>
              <div className="text-xs text-crunch-black/50">
                {portfolioSize < 15000 ? `${((15000 - portfolioSize) / 1000).toFixed(1)} MWp to 7%` : "Maximum rate achieved"}
              </div>
            </div>
            <div className="rounded-full bg-crunch-yellow/10 p-3 shadow-sm">
              <Percent className="h-5 w-5 text-crunch-yellow" />
            </div>
          </div>
          
          {/* Progress bar */}
          <div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 mt-2">
              <motion.div 
                className="bg-crunch-yellow h-2.5 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-crunch-black/50">
              <span>4%</span>
              <span>7%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
