import React from "react";
import { motion, MotionProps } from "framer-motion";

interface SafeMotionDivProps extends MotionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

/**
 * Safe wrapper for motion.div that handles animation errors gracefully
 */
export function SafeMotionDiv({ children, fallback, className, ...motionProps }: SafeMotionDivProps) {
  const [hasError, setHasError] = React.useState(false);

  // Reset error state when props change
  React.useEffect(() => {
    setHasError(false);
  }, [motionProps]);

  if (hasError) {
    console.warn("[SafeMotionDiv] Animation error detected, falling back to static div");
    return <div className={className}>{fallback || children}</div>;
  }

  try {
    return (
      <motion.div
        className={className}
        {...motionProps}
        onAnimationComplete={(definition) => {
          console.log("[SafeMotionDiv] Animation completed:", definition);
          motionProps.onAnimationComplete?.(definition);
        }}
        onError={() => {
          console.error("[SafeMotionDiv] Animation error occurred");
          setHasError(true);
        }}
      >
        {children}
      </motion.div>
    );
  } catch (error) {
    console.error("[SafeMotionDiv] Motion component error:", error);
    setHasError(true);
    return <div className={className}>{fallback || children}</div>;
  }
}