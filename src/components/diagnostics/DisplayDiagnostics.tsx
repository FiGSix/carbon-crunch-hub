import { useEffect } from "react";

/**
 * Diagnostic component to help identify display issues
 */
export function DisplayDiagnostics() {
  useEffect(() => {
    // Log browser and environment info
    console.log("[DisplayDiagnostics] Browser info:", {
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    });

    // Check CSS custom properties
    const rootStyles = getComputedStyle(document.documentElement);
    const cssVars = {
      primary: rootStyles.getPropertyValue('--primary'),
      background: rootStyles.getPropertyValue('--background'),
      foreground: rootStyles.getPropertyValue('--foreground'),
      'crunch-yellow': rootStyles.getPropertyValue('--crunch-yellow'),
    };
    
    console.log("[DisplayDiagnostics] CSS Variables:", cssVars);

    // Check for missing CSS variables
    Object.entries(cssVars).forEach(([key, value]) => {
      if (!value || value.trim() === '') {
        console.warn(`[DisplayDiagnostics] Missing CSS variable: --${key}`);
      }
    });

    // Performance check
    const performanceEntries = performance.getEntriesByType('navigation');
    if (performanceEntries.length > 0) {
      const navigation = performanceEntries[0] as PerformanceNavigationTiming;
      console.log("[DisplayDiagnostics] Load performance:", {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        totalTime: navigation.loadEventEnd - navigation.fetchStart
      });
    }
  }, []);

  return null; // This component only provides diagnostics
}