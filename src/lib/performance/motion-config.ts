/**
 * Optimized motion configuration to prevent forced reflows
 */

// Default motion config that avoids forced reflows
export const optimizedMotionConfig = {
  // Use transform and opacity instead of layout properties
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  
  // Fast, GPU-accelerated transitions
  transition: {
    type: "tween",
    duration: 0.2,
    ease: "easeOut"
  },
  
  // Prevent layout animations unless explicitly needed
  layout: false,
  
  // GPU acceleration hints
  style: {
    willChange: "transform, opacity"
  }
};

// Hover animations that don't cause reflows
export const optimizedHover = {
  whileHover: { 
    scale: 1.02,
    transition: { type: "tween", duration: 0.1 }
  },
  whileTap: { 
    scale: 0.98,
    transition: { type: "tween", duration: 0.05 }
  }
};

// Chart animation config (for dashboard components)
export const chartAnimation = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: {
    type: "tween",
    duration: 0.3,
    ease: "easeOut"
  }
};

// Staggered animations for lists
export const staggerConfig = {
  container: {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  },
  item: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: {
      type: "tween",
      duration: 0.2
    }
  }
};