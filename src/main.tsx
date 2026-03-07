
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react';
import App from './App.tsx'
import './index.css'
import './styles/base.css'
import './styles/components.css'
import './styles/animations.css'
import { validateSecurityConfig } from './lib/security/headers'

// Global startup error handlers - catch issues before React mounts
window.onerror = (message, source, lineno, colno, error) => {
  console.error('[Startup Error]', { message, source, lineno, colno, error });
  if (import.meta.env.PROD) {
    Sentry.captureException(error || new Error(String(message)));
  }
  return false;
};

window.onunhandledrejection = (event) => {
  console.error('[Unhandled Promise]', event.reason);
  if (import.meta.env.PROD) {
    Sentry.captureException(event.reason);
  }
};

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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
