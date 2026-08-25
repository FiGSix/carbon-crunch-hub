import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface StageBadgeProps {
  /** Stage key — a change cross-fades rather than teleports. */
  stage: string;
  label?: string;
  className?: string;
  variant?: "default" | "secondary" | "outline" | "destructive";
}

/**
 * Status badge that cross-fades when the stage changes: the old value fades
 * out, the new one settles in. Explains a transition instead of swapping it.
 */
export function StageBadge({
  stage,
  label,
  className,
  variant = "secondary",
}: StageBadgeProps) {
  const reduced = useReducedMotion();
  const text = label ?? stage;

  if (reduced) {
    return (
      <Badge variant={variant} className={className}>
        {text}
      </Badge>
    );
  }

  return (
    <span className={cn("relative inline-flex items-center", className)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={stage}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="inline-flex"
        >
          <Badge variant={variant}>{text}</Badge>
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
