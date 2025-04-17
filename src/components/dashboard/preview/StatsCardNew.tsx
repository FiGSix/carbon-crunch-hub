
import { ReactNode } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

interface StatsCardNewProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendDirection?: 'up' | 'down';
  color?: 'yellow' | 'green' | 'blue' | 'emerald' | 'purple';
}

export function StatsCardNew({ 
  title, 
  value, 
  icon, 
  trend, 
  trendDirection = 'up',
  color = 'yellow'
}: StatsCardNewProps) {
  
  const getIconColor = () => {
    switch(color) {
      case 'green':
        return 'bg-green-100';
      case 'blue':
        return 'bg-blue-100';
      case 'emerald':
        return 'bg-emerald-100';
      case 'purple':
        return 'bg-purple-100';
      case 'yellow':
      default:
        return 'bg-crunch-yellow/10';
    }
  };

  const getTrendColor = () => {
    if (trendDirection === 'up') {
      return 'text-green-600 bg-green-50';
    }
    return 'text-red-600 bg-red-50';
  };
  
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
          <CardTitle className="text-sm font-medium text-crunch-black/70">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold">{value}</div>
              {trend && (
                <div className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ${getTrendColor()}`}>
                  {trendDirection === 'up' ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {trend}
                </div>
              )}
            </div>
            <div className={`rounded-full ${getIconColor()} p-3 shadow-sm`}>
              {icon}
            </div>
          </div>
          {/* Add extra space to match CommissionCard height */}
          <div className="pt-4"></div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
