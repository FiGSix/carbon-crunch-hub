import { useState, useEffect, useMemo, FC, ReactNode, CSSProperties, MouseEvent, lazy, Suspense } from 'react';

// Lazy load framer-motion to defer 50KB bundle until after initial render
const motion = {
  div: lazy(() => 
    import('framer-motion').then(mod => ({
      default: mod.motion.div
    }))
  )
};

interface SafeMotionDivProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  id?: string;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
  onMouseEnter?: (event: MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (event: MouseEvent<HTMLDivElement>) => void;
  
  // Motion-specific props
  initial?: any;
  animate?: any;
  exit?: any;
  whileHover?: any;
  whileTap?: any;
  transition?: any;
  variants?: any;
  
  // Control props
  fallback?: ReactNode;
  enableAnimation?: boolean;
}

/**
 * Phase 3: Safe Motion wrapper with graceful fallbacks
 * Provides animation with automatic fallback to regular div on errors
 */
export const SafeMotionDiv: FC<SafeMotionDivProps> = ({
  children, 
  className,
  style,
  id,
  onClick,
  onMouseEnter,
  onMouseLeave,
  initial,
  animate,
  exit,
  whileHover,
  whileTap,
  transition,
  variants,
  fallback,
  enableAnimation = true
}) => {
  const [hasAnimationError, setHasAnimationError] = useState(false);

  // Disable animations in reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Error boundary for motion components
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('framer') || event.error?.message?.includes('motion')) {
        console.warn('[SafeMotionDiv] Animation error detected, falling back to static div');
        setHasAnimationError(true);
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Regular div props (safe to spread)
  const divProps = {
    className,
    style,
    id,
    onClick,
    onMouseEnter,
    onMouseLeave
  };

  // Motion props with performance optimizations
  const motionProps = {
    ...divProps,
    initial,
    animate,
    exit,
    whileHover,
    whileTap,
    transition: {
      // Optimize transitions to prevent forced reflows
      ...transition,
      type: transition?.type || "tween",
      duration: transition?.duration || 0.2,
      ease: transition?.ease || "easeOut"
    },
    variants,
    // Performance optimization: avoid layout animations by default
    layout: false,
    // Use GPU acceleration
    style: {
      ...style,
      willChange: animate ? "transform, opacity" : "auto"
    }
  };

  // Fall back to regular div if:
  // - Animation is disabled
  // - User prefers reduced motion
  // - Animation error occurred
  if (!enableAnimation || prefersReducedMotion || hasAnimationError) {
    return <div {...divProps}>{children}</div>;
  }

  try {
    const MotionDiv = motion.div;
    return (
      <Suspense fallback={<div {...divProps}>{children}</div>}>
        <MotionDiv {...motionProps}>{children}</MotionDiv>
      </Suspense>
    );
  } catch (error) {
    console.warn('[SafeMotionDiv] Motion component failed, using fallback:', error);
    return <div {...divProps}>{fallback || children}</div>;
  }
};