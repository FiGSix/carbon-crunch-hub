
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

interface CommissionProjectionCardProps {
  projectedCommission: number;
  filteredProposalsCount: number;
}

export function CommissionProjectionCard({ 
  projectedCommission, 
  filteredProposalsCount 
}: CommissionProjectionCardProps) {
  // Calculate years remaining until 2030
  const currentYear = new Date().getFullYear();
  const yearsRemaining = Math.max(0, 2030 - currentYear);
  
  const getProjectionDescription = () => {
    return `Projected commission from ${filteredProposalsCount} active proposals over ${yearsRemaining} years until 2030`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="h-full sm:col-span-2"
    >
      <Card className="overflow-hidden border border-crunch-black/5 bg-white shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-crunch-black/70">Total Potential Revenue</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div className="space-y-1">
              <div className="text-2xl font-bold">R {projectedCommission.toLocaleString()}</div>
              <div className="text-xs text-crunch-black/50">
                +12% from last period
              </div>
            </div>
            <div className="rounded-full bg-crunch-yellow/10 p-3 shadow-sm">
              <TrendingUp className="h-5 w-5 text-crunch-yellow" />
            </div>
          </div>
          
          {/* Description */}
          <p className="text-sm text-crunch-black/50">
            {getProjectionDescription()}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
