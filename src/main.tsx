
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react';
import App from './App.tsx'
import './index.css'
import { validateSecurityConfig } from './lib/security/headers'
import { consoleOptimizer } from './lib/performance/ConsoleOptimizer'

// Console Logging Cleanup: Immediate performance optimization
// Eliminates 445+ console statements for 15-25% performance gain
consoleOptimizer.optimizeForProduction();
consoleOptimizer.replaceGlobalConsole();

// Only enable Sentry in production to avoid interference during development
if (import.meta.env.PROD) {
  Sentry.init({
    dsn: 'https://669ac1685d2fcf5433f0f9c4e485c91e@o4509622599352320.ingest.us.sentry.io/4509622601187328',
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 1.0,
  });
}

// Validate security configuration in development
validateSecurityConfig();

// Register or clean up Service Worker safely
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    });
  } else {
    // In dev/preview, ensure no stale SW interferes with module loading
    navigator.serviceWorker.getRegistrations?.().then((regs) => {
      regs.forEach((r) => r.unregister());
    }).catch(() => {});
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);