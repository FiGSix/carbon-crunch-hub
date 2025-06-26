
/**
 * Application Configuration
 * 
 * This module provides centralized configuration management
 * for the application, replacing the previous .env file approach.
 */

export const AppConfig = {
  // Application metadata
  app: {
    name: 'Crunch Carbon',
    version: '1.0.0',
    description: 'Carbon offset proposals and client management platform',
  },

  // Supabase configuration (public keys are safe to embed)
  supabase: {
    url: 'https://uyjryuopuqgmsvayiccl.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5anJ5dW9wdXFnbXN2YXlpY2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNzU2MzgsImV4cCI6MjA1OTg1MTYzOH0.M828t6sJxh4lZAVACqpRosoRvW_VibHDAMSXV-3WrLo',
  },

  // Development vs Production settings
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,

  // Feature flags
  features: {
    enableSecurityAudit: true,
    enableDetailedLogging: import.meta.env.DEV,
    enablePerformanceMonitoring: true,
  },

  // API configuration
  api: {
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  },
} as const;

export type AppConfigType = typeof AppConfig;
