
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
  
  const getGradient = () => {
    switch(color) {
      case 'green':
        return 'from-green-50 to-white';
      case 'blue':
        return 'from-blue-50 to-white';
      case 'emerald':
        return 'from-emerald-50 to-white';
      case 'purple':
        return 'from-purple-50 to-white';
      case 'yellow':
      default:
        return 'from-crunch-yellow/5 to-white';
    }
  };
  
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
    >
      <Card className={`overflow-hidden border border-crunch-black/5 bg-gradient-to-br ${getGradient()} shadow-sm hover:shadow-md transition-all duration-300`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-crunch-black/70">{title}</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </motion.div>
  );
}
