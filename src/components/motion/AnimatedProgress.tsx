import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface AnimatedProgressProps {
  /** 0–100 */
  value: number;
  className?: string;
  /** Show the percentage beside the bar. */
  showValue?: boolean;
  label?: string;
}

/**
 * Progress that tweens to its new percentage so completion feels like movement
 * rather than a jump. Collapses to an instant set under reduced motion.
 */
export function AnimatedProgress({
  value,
  className,
  showValue = false,
  label,
}: AnimatedProgressProps) {
  const reduced = useReducedMotion();
  const target = Math.max(0, Math.min(100, Math.round(value)));
  const [shown, setShown] = useState(reduced ? target : 0);

  useEffect(() => {
    if (reduced) {
      setShown(target);
      return;
    }
    // Defer a frame so the CSS transition on the indicator has a start value.
    const id = requestAnimationFrame(() => setShown(target));
    return () => cancelAnimationFrame(id);
  }, [target, reduced]);

  return (
    <div className={cn("space-y-1", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {label && <span>{label}</span>}
          {showValue && <span className="tabular-nums">{target}%</span>}
        </div>
      )}
      <Progress
        value={shown}
        className={cn(!reduced && "[&>*]:transition-transform [&>*]:duration-700 [&>*]:ease-out")}
      />
    </div>
  );
}
