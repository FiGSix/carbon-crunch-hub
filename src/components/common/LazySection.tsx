import { useState, useEffect, useRef, ReactNode } from 'react';

interface LazySectionProps {
  children: ReactNode;
  threshold?: number;
  rootMargin?: string;
  fallbackHeight?: string;
}

/**
 * Lazy loads sections when they enter the viewport
 * Reduces initial render work by deferring below-the-fold content
 */
export const LazySection = ({ 
  children, 
  threshold = 0.1,
  rootMargin = "100px",
  fallbackHeight = "400px"
}: LazySectionProps) => {
  const [shouldRender, setShouldRender] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return (
    <div ref={ref} style={{ minHeight: shouldRender ? 'auto' : fallbackHeight }}>
      {shouldRender ? children : null}
    </div>
  );
};
