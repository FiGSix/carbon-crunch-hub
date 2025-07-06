# Production Security Deployment Guide

## HTTPS Configuration

### 1. Platform-Specific HTTPS Setup

**Vercel/Netlify/Cloudflare Pages:**
- HTTPS is automatically enabled with free SSL certificates
- Custom domains require DNS configuration

**Other Platforms:**
- Ensure SSL certificate is installed and configured
- Force HTTPS redirects at server level

## Security Headers Implementation

### 1. Vercel Deployment
Create `vercel.json` in project root:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://uyqryuopuqgmsvaviccl.supabase.co wss://uyqryuopuqgmsvaviccl.supabase.co https://api.sentry.io; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

### 2. Netlify Deployment
Create `public/_headers` file:

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://uyqryuopuqgmsvaviccl.supabase.co wss://uyqryuopuqgmsvaviccl.supabase.co https://api.sentry.io; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
```

### 3. Cloudflare Pages
Create `public/_headers` file (same as Netlify).

## Security Header Explanations

- **Content-Security-Policy**: Prevents XSS attacks by controlling resource loading
- **Strict-Transport-Security**: Forces HTTPS for all future requests
- **X-Content-Type-Options**: Prevents MIME type sniffing attacks
- **X-Frame-Options**: Prevents clickjacking attacks
- **Referrer-Policy**: Controls referrer information leaking

## Enterprise Security Checklist

- [ ] HTTPS enabled with valid SSL certificate
- [ ] Security headers configured at server level
- [ ] Regular security audits scheduled
- [ ] Dependency vulnerability scanning enabled
- [ ] Error monitoring with Sentry configured
- [ ] Access logs monitored
- [ ] Rate limiting implemented (if needed)
- [ ] Regular backups configured
- [ ] Incident response plan documented

## Testing Security Headers

Use these tools to verify your security headers:
- [SecurityHeaders.com](https://securityheaders.com)
- [Mozilla Observatory](https://observatory.mozilla.org)
- Browser DevTools Network tab

## Additional Considerations

1. **CSP Reporting**: Consider adding CSP reporting for violations
2. **HSTS Preload**: Submit domain to HSTS preload list
3. **Certificate Transparency**: Monitor CT logs for certificate issuance
4. **Regular Updates**: Keep dependencies and platform updated