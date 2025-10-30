/**
 * Optimized motion configuration to prevent forced reflows
 * Always use transform and opacity for animations to avoid layout recalculations
 */

// Reusable GPU-accelerated style
export const gpuAcceleratedStyle = {
  willChange: "transform, opacity" as const,
  transform: "translateZ(0)",
};

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
    ease: "easeOut",
    delay: 0.05 // Small delay prevents render blocking
  },
  
  // Prevent layout animations unless explicitly needed
  layout: false,
  layoutScroll: false, // Prevent scroll-based layout animations
  
  // GPU acceleration hints
  style: gpuAcceleratedStyle
};

// Hover animations that don't cause reflows (GPU-accelerated scale only)
export const optimizedHover = {
  style: gpuAcceleratedStyle,
  whileHover: { 
    scale: 1.02,
    transition: { type: "tween", duration: 0.15, ease: "easeOut" }
  },
  whileTap: { 
    scale: 0.98,
    transition: { type: "tween", duration: 0.1, ease: "easeOut" }
  }
};

// Chart animation config (for dashboard components)
export const chartAnimation = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  style: gpuAcceleratedStyle,
  transition: {
    type: "tween",
    duration: 0.3,
    ease: "easeOut"
  }
};

// Staggered animations for lists (GPU-accelerated)
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
    style: gpuAcceleratedStyle,
    transition: {
      type: "tween",
      duration: 0.2
    }
  }
};

// Fade in animation (minimal, GPU-accelerated)
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  style: gpuAcceleratedStyle,
  transition: {
    type: "tween",
    duration: 0.2,
    ease: "easeOut",
    delay: 0.05
  }
};

// Slide up animation (GPU-accelerated)
export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  style: gpuAcceleratedStyle,
  transition: {
    type: "tween",
    duration: 0.3,
    ease: "easeOut",
    delay: 0.05
  }
};