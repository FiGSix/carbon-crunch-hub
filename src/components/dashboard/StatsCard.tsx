
import { type ReactNode, useMemo, memo } from "react";
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
  color?: 'yellow' | 'green' | 'blue' | 'emerald' | 'purple' | 'orange' | 'red';
  className?: string;
  isLegacy?: boolean;
  onClick?: () => void;
  /** When provided, the figure counts to this value instead of rendering `value` statically. */
  numericValue?: number;
  /** Formats the animated figure. */
  formatValue?: (n: number) => string;
  /** Extra context revealed on hover — keeps the card clean at rest. */
  hoverDetail?: string;
  /** Action affordance revealed on hover when the card is clickable. */
  actionLabel?: string;
  /** Emphasises the card once — used for the Audit Ready moment. */
  sweep?: boolean;
}


function StatsCardComponent({ 
  title, 
  value, 
  icon, 
  trend, 
  trendDirection = 'up',
  color = 'yellow',
  className,
  isLegacy = false,
  onClick,
  numericValue,
  formatValue,
  hoverDetail,
  actionLabel,
  sweep = false

}: StatsCardProps) {
  
  const getIconColor = useMemo(() => {
    if (isLegacy) {
      return 'bg-carbon-green-100';
    }
    
    switch(color) {
      case 'green':
        return 'bg-[#DEF1D3] text-[#8ED973]';
      case 'blue':
        return 'bg-[#F0EBDC] text-[#FFCD03]';
      case 'emerald':
        return 'bg-crunch-yellow/10 text-crunch-yellow';
      case 'purple':
        return 'bg-crunch-yellow/10 text-crunch-yellow';
      case 'orange':
        return 'bg-orange-500/10 text-orange-600';
      case 'red':
        return 'bg-[#FDF3EC] text-[#FF4C44]';
      case 'yellow':
      default:
        return 'bg-crunch-yellow/10 text-crunch-yellow';
    }
  }, [isLegacy, color]);

  const getValueColor = useMemo(() => {
    if (color === 'red') {
      return 'text-[#FF4C44]';
    }
    if (color === 'green') {
      return 'text-[#8ED973]';
    }
    if (color === 'blue') {
      return 'text-[#FFCD03]';
    }
    if (color === 'yellow') {
      return 'text-crunch-yellow';
    }
    return '';
  }, [color]);

  const getTrendColor = useMemo(() => {
    if (trendDirection === 'up') {
      return 'text-green-600 bg-green-50';
    }
    return 'text-red-600 bg-red-50';
  }, [trendDirection]);
  
  // Determine card styling based on whether it's the legacy version or modern version
  const cardClassName = useMemo(() => {
    const baseClass = isLegacy 
      ? "retro-card" 
      : "overflow-hidden border border-crunch-black/5 bg-white shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col";
    return onClick ? `${baseClass} cursor-pointer` : baseClass;
  }, [isLegacy, onClick]);

  // Determine title styling based on version
  const titleClassName = useMemo(() => isLegacy
    ? "text-sm font-medium text-carbon-gray-500"
    : "text-sm font-medium text-crunch-black/70",
    [isLegacy]
  );
    
  // For modern version, wrap in motion div, otherwise just render the Card directly
  const CardComponent = useMemo(() => isLegacy 
    ? ({ children }: { children: ReactNode }) => (
        <Card className={cn(cardClassName, className)} onClick={onClick}>
          {children}
        </Card>
      )
    : ({ children }: { children: ReactNode }) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
          className="h-full"
        >
          <Card className={cn(cardClassName, className)} onClick={onClick}>
            {children}
          </Card>
        </motion.div>
      ), [isLegacy, cardClassName, className, onClick]);
  
  return (
    <CardComponent>
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
        <CardTitle className={cn(titleClassName, "line-clamp-3 flex-1")}>
          {title}
        </CardTitle>
        <div className={`rounded-full ${getIconColor} ${isLegacy ? 'p-2' : 'p-3 shadow-sm'} flex-shrink-0`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent className={!isLegacy ? "flex-1 flex flex-col justify-between" : ""}>
        <div className={!isLegacy ? "space-y-1" : ""}>
          <div className={cn("text-xl font-bold", getValueColor)}>{value}</div>
          {!isLegacy && trend && (
            <div className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ${getTrendColor}`}>
              {trendDirection === 'up' ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {trend}
            </div>
          )}
        </div>
        {/* Add extra space for non-legacy cards to match CommissionCard height */}
        {!isLegacy && <div className="pt-4"></div>}
      </CardContent>
    </CardComponent>
  );
}

export const StatsCard = memo(StatsCardComponent);

