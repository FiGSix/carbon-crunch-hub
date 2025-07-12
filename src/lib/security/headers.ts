/**
 * Security Headers Configuration
 * Production deployment security recommendations
 */

export const SECURITY_HEADERS = {
  // Content Security Policy - Restrict resource loading
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for React and Vite
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://uyqryuopuqgmsvaviccl.supabase.co wss://uyqryuopuqgmsvaviccl.supabase.co https://api.sentry.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),

  // Force HTTPS for all future requests
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Disable certain browser features
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()'
  ].join(', ')
} as const;

/**
 * Deployment Platform Configuration Examples
 */
export const DEPLOYMENT_CONFIGS = {
  // Vercel - vercel.json
  vercel: {
    headers: [
      {
        source: '/(.*)',
        headers: Object.entries(SECURITY_HEADERS).map(([key, value]) => ({
          key,
          value
        }))
      }
    ]
  },

  // Netlify - _headers file
  netlify: `/*
${Object.entries(SECURITY_HEADERS)
  .map(([key, value]) => `  ${key}: ${value}`)
  .join('\n')}`,

  // Cloudflare Pages - _headers file (same as Netlify)
  cloudflare: `/*
${Object.entries(SECURITY_HEADERS)
  .map(([key, value]) => `  ${key}: ${value}`)
  .join('\n')}`,

  // Apache - .htaccess
  apache: `# Security Headers
Header always set Content-Security-Policy "${SECURITY_HEADERS['Content-Security-Policy']}"
Header always set Strict-Transport-Security "${SECURITY_HEADERS['Strict-Transport-Security']}"
Header always set X-Content-Type-Options "${SECURITY_HEADERS['X-Content-Type-Options']}"
Header always set X-Frame-Options "${SECURITY_HEADERS['X-Frame-Options']}"
Header always set Referrer-Policy "${SECURITY_HEADERS['Referrer-Policy']}"
Header always set Permissions-Policy "${SECURITY_HEADERS['Permissions-Policy']}"

# Force HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]`,

  // Nginx
  nginx: `# Security Headers
add_header Content-Security-Policy "${SECURITY_HEADERS['Content-Security-Policy']}" always;
add_header Strict-Transport-Security "${SECURITY_HEADERS['Strict-Transport-Security']}" always;
add_header X-Content-Type-Options "${SECURITY_HEADERS['X-Content-Type-Options']}" always;
add_header X-Frame-Options "${SECURITY_HEADERS['X-Frame-Options']}" always;
add_header Referrer-Policy "${SECURITY_HEADERS['Referrer-Policy']}" always;
add_header Permissions-Policy "${SECURITY_HEADERS['Permissions-Policy']}" always;

# Force HTTPS
if ($scheme != "https") {
    return 301 https://$host$request_uri;
}`
};

/**
 * Security checklist for production deployment
 */
export const SECURITY_CHECKLIST = [
  '✅ HTTPS enabled with valid SSL certificate',
  '✅ Security headers configured',
  '✅ Content Security Policy implemented',
  '✅ HSTS header with preload enabled',
  '✅ Clickjacking protection (X-Frame-Options)',
  '✅ MIME type sniffing disabled',
  '✅ Referrer policy configured',
  '✅ Permissions policy restrictions',
  '✅ Supabase URLs in CSP connect-src',
  '✅ Sentry URLs in CSP connect-src',
  '✅ Regular security audits scheduled'
] as const;

/**
 * Runtime security validation (development only)
 */
export function validateSecurityConfig(): void {
  if (import.meta.env.DEV) {
    console.group('🔒 Security Configuration Check');
    
    // Check if running over HTTPS in production-like environment
    if (location.protocol === 'http:' && location.hostname !== 'localhost') {
      console.warn('⚠️ Site not served over HTTPS');
    } else {
      console.log('✅ HTTPS protocol detected');
    }
    
    // Check CSP meta tag
    const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!csp) {
      console.warn('⚠️ No CSP meta tag found - ensure headers are set at server level');
    } else {
      console.log('✅ Content Security Policy meta tag found');
      console.log('🔒 CSP Policy:', csp.getAttribute('content'));
    }
    
    console.log('📋 Security headers should be configured at deployment platform level');
    console.groupEnd();
  }
}