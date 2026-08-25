
import { type ReactNode, useMemo, memo } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { useReducedMotion } from "@/hooks/useReducedMotion";


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
      : "group relative overflow-hidden border border-crunch-black/5 bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:border-crunch-yellow/40 h-full flex flex-col";
    return onClick ? `${baseClass} cursor-pointer` : baseClass;
  }, [isLegacy, onClick]);

  // Determine title styling based on version
  const titleClassName = useMemo(() => isLegacy
    ? "text-sm font-medium text-carbon-gray-500"
    : "text-sm font-medium text-crunch-black/70",
    [isLegacy]
  );

  // Hover lift is deliberately slight — cards should not jump or bounce.
  const CardComponent = useMemo(() => isLegacy 
    ? ({ children }: { children: ReactNode }) => (
        <Card className={cn(cardClassName, className)} onClick={onClick}>
          {children}
        </Card>
      )
    : ({ children }: { children: ReactNode }) => (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          whileHover={reduced ? undefined : { y: -2, transition: { duration: 0.15 } }}
          className="h-full"
        >
          <Card className={cn(cardClassName, className)} onClick={onClick}>
            {children}
          </Card>
        </motion.div>
      ), [isLegacy, cardClassName, className, onClick, reduced]);
  
  return (
    <CardComponent>
      {sweep && !reduced && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-highlight-sweep bg-gradient-to-r from-transparent via-crunch-yellow/15 to-transparent"
        />
      )}
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
          <div className={cn("text-xl font-bold", getValueColor)}>
            {typeof numericValue === "number" ? (
              <AnimatedNumber value={numericValue} format={formatValue} />
            ) : (
              value
            )}
          </div>
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
        {/* Progressive disclosure: detail and action appear only on hover/focus. */}
        {!isLegacy && (hoverDetail || actionLabel) ? (
          <div className="pt-3 min-h-[2.25rem]">
            <div className="opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0">
              {hoverDetail && (
                <p className="text-xs text-crunch-black/60">{hoverDetail}</p>
              )}
              {actionLabel && (
                <p className="mt-0.5 text-xs font-medium text-crunch-black inline-flex items-center gap-1">
                  {actionLabel}
                  <ArrowRight className="h-3 w-3" />
                </p>
              )}
            </div>
          </div>
        ) : (
          !isLegacy && <div className="pt-4" />
        )}
      </CardContent>
    </CardComponent>
  );
}


export const StatsCard = memo(StatsCardComponent);

