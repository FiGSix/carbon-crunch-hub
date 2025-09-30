import React, { useEffect, useState } from 'react';
import { devLogger } from '@/lib/performance/ConsoleReplacementUtility';

/**
 * CSS System Diagnostics - Phase 2 Component
 * Monitors CSS loading and provides fallback detection
 */
export const CSSFallbackDiagnostics = () => {
  const [cssStatus, setCssStatus] = useState({
    tailwindLoaded: false,
    customCssLoaded: false,
    gridContainerWorking: false,
    colorVariablesWorking: false
  });

  useEffect(() => {
    const checkCSSStatus = () => {
      const testElement = document.createElement('div');
      document.body.appendChild(testElement);

      try {
        // Test Tailwind classes
        testElement.className = 'bg-primary text-white p-4 hidden';
        const computedStyle = getComputedStyle(testElement);
        const hasBg = computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)';
        
        // Test container-responsive
        testElement.className = 'container-responsive';
        const hasGridContainer = getComputedStyle(testElement).maxWidth !== 'none';
        
        // Test CSS variables
        testElement.style.color = 'hsl(var(--primary))';
        const hasColorVars = getComputedStyle(testElement).color !== 'hsl(var(--primary))';

        setCssStatus({
          tailwindLoaded: hasBg,
          customCssLoaded: true,
          gridContainerWorking: hasGridContainer,
          colorVariablesWorking: hasColorVars
        });

        console.log('[CSS Diagnostics] Status:', {
          tailwindLoaded: hasBg,
          gridContainerWorking: hasGridContainer,
          colorVariablesWorking: hasColorVars
        });

      } catch (error) {
        devLogger.testing.error('CSS Diagnostics error', error);
      } finally {
        document.body.removeChild(testElement);
      }
    };

    // Check immediately and after a delay
    checkCSSStatus();
    const timeoutId = setTimeout(checkCSSStatus, 500);

    return () => clearTimeout(timeoutId);
  }, []);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div 
      className="fixed bottom-4 right-4 bg-black/80 text-white p-2 rounded text-xs font-mono z-50"
      style={{
        backgroundColor: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontFamily: 'monospace',
        zIndex: 50
      }}
    >
      <div>CSS Status (Phase 2):</div>
      <div style={{ color: cssStatus.tailwindLoaded ? '#10b981' : '#ef4444' }}>
        Tailwind: {cssStatus.tailwindLoaded ? '✓' : '✗'}
      </div>
      <div style={{ color: cssStatus.gridContainerWorking ? '#10b981' : '#ef4444' }}>
        Grid: {cssStatus.gridContainerWorking ? '✓' : '✗'}
      </div>
      <div style={{ color: cssStatus.colorVariablesWorking ? '#10b981' : '#ef4444' }}>
        Colors: {cssStatus.colorVariablesWorking ? '✓' : '✗'}
      </div>
    </div>
  );
};