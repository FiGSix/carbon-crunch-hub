
import React from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import App from './App.tsx'
import './index.css'
import { validateSecurityConfig } from './lib/security/headers'

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN_HERE',
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
