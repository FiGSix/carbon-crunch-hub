import { memo } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Percent } from "lucide-react";
import { getAgentCommissionPercentage } from "@/lib/calculations/carbon";
import { formatSystemSizeForDisplay } from "@/lib/calculations/carbon/normalization";
import { PortfolioData } from "@/services/proposals/portfolioService";

interface OptimizedCommissionCardProps {
  portfolioData: PortfolioData | null;
  loading: boolean;
}

function OptimizedCommissionCardComponent({ portfolioData, loading }: OptimizedCommissionCardProps) {
  // Use portfolio data directly (no hook calls inside component)
  const portfolioSize = portfolioData?.totalKWp || 0;
  
  // Use the carbon calculation library's function which handles unit conversion properly
  const commissionRate = getAgentCommissionPercentage(portfolioSize);
  
  // Calculate progress towards next tier (as percentage)
  // The threshold is 15,000 kWp (15 MWp) for 7% commission
  const progress = portfolioSize >= 15000 ? 100 : (portfolioSize / 15000) * 100;
  
  // Calculate remaining kWp needed to reach 7% commission
  const remainingKWp = Math.max(0, 15000 - portfolioSize);
  
  if (loading) {
    return (
      <Card className="overflow-hidden border border-crunch-black/5 bg-white shadow-sm h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-crunch-black/70">Commission</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded mb-4"></div>
            <div className="h-2.5 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="overflow-hidden border border-crunch-black/5 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-crunch-black/70">Commission</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        <div className="flex justify-between items-center mb-4">
          <div className="space-y-1">
            <div className="text-2xl font-bold">{commissionRate}%</div>
            <div className="text-xs text-crunch-black/50">
              {portfolioSize < 15000 ? `${formatSystemSizeForDisplay(remainingKWp)} to 7%` : "Maximum rate achieved"}
            </div>
          </div>
          <div className="rounded-full bg-crunch-yellow/10 p-3 shadow-sm">
            <Percent className="h-5 w-5 text-crunch-yellow" />
          </div>
        </div>
        
        {/* Simplified progress bar */}
        <div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 mt-2">
            <div 
              className="bg-crunch-yellow h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-crunch-black/50">
            <span>4%</span>
            <span>7%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const OptimizedCommissionCard = memo(OptimizedCommissionCardComponent);