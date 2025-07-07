
import React from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import App from './App.tsx'
import './index.css'
import { validateSecurityConfig } from './lib/security/headers'
import { consoleOptimizer } from './lib/performance/ConsoleOptimizer'

// Phase 1: Optimize console logging performance
consoleOptimizer.optimizeForProduction();

Sentry.init({
  dsn: 'https://669ac1685d2fcf5433f0f9c4e485c91e@o4509622599352320.ingest.us.sentry.io/4509622601187328',
  integrations: [new BrowserTracing()],
  tracesSampleRate: 1.0,
});

// Validate security configuration in development
validateSecurityConfig();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
