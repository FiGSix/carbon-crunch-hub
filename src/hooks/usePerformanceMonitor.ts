
import { useEffect, useRef } from 'react';

interface PerformanceOptions {
  componentName: string;
  trackProps?: boolean;
  logThreshold?: number; // Only log if render time exceeds this (ms)
}

export function usePerformanceMonitor(
  dependencies: any[], 
  options: PerformanceOptions
) {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());
  const propsRef = useRef<any[]>([]);

  useEffect(() => {
    const currentTime = Date.now();
    const timeSinceLastRender = currentTime - lastRenderTimeRef.current;
    renderCountRef.current += 1;

    // Check for rapid re-renders (potential performance issue)
    if (timeSinceLastRender < 100 && renderCountRef.current > 1) {
      console.warn(
        `🚨 Rapid re-render detected in ${options.componentName}`,
        {
          renderCount: renderCountRef.current,
          timeSinceLastRender,
          dependencies
        }
      );
    }

    // Track prop changes if enabled
    if (options.trackProps) {
      const propsChanged = !propsRef.current.every((prev, index) => 
        prev === dependencies[index]
      );
      
      if (propsChanged && renderCountRef.current > 1) {
        console.log(
          `🔄 Props changed in ${options.componentName}`,
          {
            renderCount: renderCountRef.current,
            oldProps: propsRef.current,
            newProps: dependencies
          }
        );
      }
    }

    // Log performance if it exceeds threshold
    if (options.logThreshold && timeSinceLastRender > options.logThreshold) {
      console.log(
        `⏱️ Slow render in ${options.componentName}: ${timeSinceLastRender}ms`,
        { renderCount: renderCountRef.current }
      );
    }

    lastRenderTimeRef.current = currentTime;
    propsRef.current = [...dependencies];
  }, dependencies);

  // Return performance stats for debugging
  return {
    renderCount: renderCountRef.current,
    componentName: options.componentName
  };
}
