
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { motion } from "framer-motion";
import { Percent } from "lucide-react";
import { getAgentCommissionPercentage } from "@/lib/calculations/carbon";
import { useAgentPortfolioData } from "@/components/proposals/summary/carbon/hooks/useAgentPortfolioData";

interface CommissionCardProps {
  portfolioSize?: number; // Keep for backward compatibility, but we'll use the hook instead
}

export function CommissionCard({ portfolioSize }: CommissionCardProps) {
  // Use the agent portfolio hook to get real-time agent portfolio data
  const { agentPortfolioData, loading } = useAgentPortfolioData({
    systemSize: "0", // No current project size for dashboard view
    proposalId: null // Not viewing a specific proposal
  });

  // Use agent's actual portfolio size from the hook
  const actualPortfolioSize = agentPortfolioData?.totalKWp || portfolioSize || 0;
  
  // Use the carbon calculation library's function which handles unit conversion properly
  const commissionRate = getAgentCommissionPercentage(actualPortfolioSize);
  
  // Calculate progress towards next tier (as percentage)
  // The threshold is 15,000 kWp (15 MWp) for 7% commission
  const progress = actualPortfolioSize >= 15000 ? 100 : (actualPortfolioSize / 15000) * 100;
  
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        <Card className="overflow-hidden border border-crunch-black/5 bg-white shadow-sm h-full flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-crunch-black/70">Commission</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }
  
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
                {actualPortfolioSize < 15000 ? `${((15000 - actualPortfolioSize) / 1000).toFixed(1)} MWp to 7%` : "Maximum rate achieved"}
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
