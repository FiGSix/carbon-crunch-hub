/**
 * Development utilities - excluded from production builds
 */

// Console logging helper that only works in development
export const devLog = import.meta.env.DEV 
  ? {
      info: (message: string, ...args: any[]) => console.log(`🔍 [DEV] ${message}`, ...args),
      warn: (message: string, ...args: any[]) => console.warn(`⚠️ [DEV] ${message}`, ...args),
      error: (message: string, ...args: any[]) => console.error(`❌ [DEV] ${message}`, ...args),
      debug: (component: string, data: any) => console.log(`🐛 [${component}]`, data)
    }
  : {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {}
    };

// Performance measurement helper
export const devPerf = import.meta.env.DEV 
  ? {
      mark: (name: string) => performance.mark(name),
      measure: (name: string, start: string, end: string) => {
        performance.measure(name, start, end);
        const measure = performance.getEntriesByName(name)[0];
        console.log(`⏱️ [PERF] ${name}: ${measure.duration.toFixed(2)}ms`);
      },
      time: (label: string) => console.time(label),
      timeEnd: (label: string) => console.timeEnd(label)
    }
  : {
      mark: () => {},
      measure: () => {},
      time: () => {},
      timeEnd: () => {}
    };

// Component render tracking for development
export const devRender = import.meta.env.DEV 
  ? {
      track: (componentName: string, props?: any) => {
        console.log(`🎨 [RENDER] ${componentName}`, props ? { props } : '');
      }
    }
  : {
      track: () => {}
    };

// Development-only component wrapper
export function DevOnly({ children }: { children: React.ReactNode }) {
  if (!import.meta.env.DEV) {
    return null;
  }
  return <>{children}</>;
}

// Production-only component wrapper  
export function ProdOnly({ children }: { children: React.ReactNode }) {
  if (import.meta.env.DEV) {
    return null;
  }
  return <>{children}</>;
}

// Environment check utilities
export const isDev = import.meta.env.DEV;
export const isProd = import.meta.env.PROD;

// Debug panel component that only renders in development
export function DebugPanel({ children }: { children: React.ReactNode }) {
  if (!import.meta.env.DEV) {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-black text-white text-xs p-2 rounded opacity-50 hover:opacity-100 transition-opacity z-50">
      {children}
    </div>
  );
}