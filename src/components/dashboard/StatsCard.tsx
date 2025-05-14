
import { ReactNode } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendDirection?: 'up' | 'down';
  color?: 'yellow' | 'green' | 'blue' | 'emerald' | 'purple';
  className?: string;
  isLegacy?: boolean;
}

export function StatsCard({ 
  title, 
  value, 
  icon, 
  trend, 
  trendDirection = 'up',
  color = 'yellow',
  className,
  isLegacy = false
}: StatsCardProps) {
  
  const getIconColor = () => {
    if (isLegacy) {
      return 'bg-carbon-green-100';
    }
    
    switch(color) {
      case 'green':
        return 'bg-crunch-yellow/10 text-crunch-yellow';
      case 'blue':
        return 'bg-crunch-yellow/10 text-crunch-yellow';
      case 'emerald':
        return 'bg-crunch-yellow/10 text-crunch-yellow';
      case 'purple':
        return 'bg-crunch-yellow/10 text-crunch-yellow';
      case 'yellow':
      default:
        return 'bg-crunch-yellow/10 text-crunch-yellow';
    }
  };

  const getTrendColor = () => {
    if (trendDirection === 'up') {
      return 'text-green-600 bg-green-50';
    }
    return 'text-red-600 bg-red-50';
  };
  
  // Determine card styling based on whether it's the legacy version or modern version
  const cardClassName = isLegacy 
    ? "retro-card" 
    : "overflow-hidden border border-crunch-black/5 bg-white shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col";

  // Determine title styling based on version
  const titleClassName = isLegacy
    ? "text-sm font-medium text-carbon-gray-500"
    : "text-sm font-medium text-crunch-black/70";
    
  // For modern version, wrap in motion div, otherwise just render the Card directly
  const CardComponent = isLegacy 
    ? ({ children }: { children: ReactNode }) => <Card className={cn(cardClassName, className)}>{children}</Card>
    : ({ children }: { children: ReactNode }) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
          className="h-full"
        >
          <Card className={cn(cardClassName, className)}>{children}</Card>
        </motion.div>
      );
  
  return (
    <CardComponent>
      <CardHeader className="pb-2">
        <CardTitle className={titleClassName}>{title}</CardTitle>
      </CardHeader>
      <CardContent className={!isLegacy ? "flex-1 flex flex-col justify-between" : ""}>
        <div className="flex justify-between items-center">
          <div className={!isLegacy ? "space-y-1" : ""}>
            <div className="text-2xl font-bold">{value}</div>
            {!isLegacy && trend && (
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
          <div className={`rounded-full ${getIconColor()} ${isLegacy ? 'p-2' : 'p-3 shadow-sm'}`}>
            {icon}
          </div>
        </div>
        {/* Add extra space for non-legacy cards to match CommissionCard height */}
        {!isLegacy && <div className="pt-4"></div>}
      </CardContent>
    </CardComponent>
  );
}

/**
 * @deprecated Use StatsCard with isLegacy=true instead
 */
export function StatsCardLegacy({ title, value, icon }: Omit<StatsCardProps, 'isLegacy' | 'trend' | 'trendDirection' | 'color'>) {
  return (
    <StatsCard 
      title={title}
      value={value}
      icon={icon}
      isLegacy={true}
    />
  );
}

/**
 * @deprecated Use StatsCard instead
 */
export function StatsCardNew(props: Omit<StatsCardProps, 'isLegacy'>) {
  return (
    <StatsCard 
      {...props}
      isLegacy={false}
    />
  );
}
