
/**
 * Security Configuration Module
 * 
 * This module centralizes security-related configuration and provides
 * documentation for secure development practices.
 */

export const SecurityConfig = {
  // Authentication settings
  auth: {
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },

  // API security settings
  api: {
    // Rate limiting settings (to be implemented with backend)
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100, // limit each IP to 100 requests per windowMs
    },
    
    // Request timeout settings
    timeout: 30000, // 30 seconds
  },

  // Content Security Policy headers (for future implementation)
  csp: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", "https://uyjryuopuqgmsvayiccl.supabase.co"],
  },

  // Security headers for production
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  },
} as const;

/**
 * Security Best Practices Documentation
 * 
 * This object serves as documentation for security practices
 * implemented throughout the application.
 */
export const SecurityDocumentation = {
  authentication: {
    description: "User authentication is handled through Supabase Auth with JWT tokens",
    practices: [
      "Session tokens are automatically refreshed",
      "Sessions persist in localStorage with automatic cleanup",
      "Row Level Security (RLS) policies protect database access",
      "User roles are validated on both client and server side",
    ],
  },

  dataProtection: {
    description: "Data protection through multiple layers of security",
    practices: [
      "All database operations use Row Level Security policies",
      "User data is isolated by authenticated user ID",
      "Sensitive operations require explicit user authentication",
      "Database functions validate user permissions before execution",
    ],
  },

  secretsManagement: {
    description: "Secrets and API keys are managed securely",
    practices: [
      "No secrets are committed to version control",
      "API keys are stored in Supabase secrets management",
      "Public keys (like Supabase anon key) are safely embedded in client code",
      "Edge functions access secrets through Supabase environment variables",
    ],
  },

  codeQuality: {
    description: "Code quality measures to prevent security vulnerabilities",
    practices: [
      "TypeScript strict mode enabled for type safety",
      "Input validation on all user inputs",
      "Error handling prevents information leakage",
      "Logging excludes sensitive information",
    ],
  },
} as const;

/**
 * Utility function to validate environment configuration
 */
export function validateSecurityConfig(): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check if we're in production and validate accordingly
  if (import.meta.env.PROD) {
    // In production, we should have proper security headers
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      issues.push("Content Security Policy not configured");
    }
  }

  // Validate localStorage availability for session persistence
  try {
    localStorage.setItem('__security_test__', 'test');
    localStorage.removeItem('__security_test__');
  } catch {
    issues.push("localStorage not available for session persistence");
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}
