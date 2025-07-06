import React from 'react';
import { motion } from 'framer-motion';

interface SafeMotionDivProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseEnter?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<HTMLDivElement>) => void;
  
  // Motion-specific props
  initial?: any;
  animate?: any;
  exit?: any;
  whileHover?: any;
  whileTap?: any;
  transition?: any;
  variants?: any;
  
  // Control props
  fallback?: React.ReactNode;
  enableAnimation?: boolean;
}

/**
 * Phase 3: Safe Motion wrapper with graceful fallbacks
 * Provides animation with automatic fallback to regular div on errors
 */
export const SafeMotionDiv: React.FC<SafeMotionDivProps> = ({ 
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
  const [hasAnimationError, setHasAnimationError] = React.useState(false);

  // Disable animations in reduced motion preference
  const prefersReducedMotion = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Error boundary for motion components
  React.useEffect(() => {
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

  // Motion props
  const motionProps = {
    ...divProps,
    initial,
    animate,
    exit,
    whileHover,
    whileTap,
    transition,
    variants
  };

  // Fall back to regular div if:
  // - Animation is disabled
  // - User prefers reduced motion
  // - Animation error occurred
  if (!enableAnimation || prefersReducedMotion || hasAnimationError) {
    return <div {...divProps}>{children}</div>;
  }

  try {
    return <motion.div {...motionProps}>{children}</motion.div>;
  } catch (error) {
    console.warn('[SafeMotionDiv] Motion component failed, using fallback:', error);
    return <div {...divProps}>{fallback || children}</div>;
  }
};