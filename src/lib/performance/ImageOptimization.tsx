import { lazy } from 'react';

/**
 * Enhanced image optimization with WebP support and lazy loading
 */
export interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: string;
  loading?: 'lazy' | 'eager';
  sizes?: string;
}

/**
 * Optimized image component with WebP support and lazy loading
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder = 'blur',
  loading = 'lazy',
  sizes = '100vw'
}: OptimizedImageProps) {
  // Generate WebP version path
  const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  
  return (
    <picture className={className}>
      {/* WebP format for modern browsers */}
      <source srcSet={webpSrc} type="image/webp" sizes={sizes} />
      {/* Fallback for older browsers */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        className="w-full h-auto"
        style={{
          backgroundImage: placeholder === 'blur' ? 'linear-gradient(45deg, #f0f0f0, #e0e0e0)' : undefined,
          backgroundSize: 'cover'
        }}
        onLoad={(e) => {
          // Remove placeholder background once loaded
          const img = e.target as HTMLImageElement;
          img.style.backgroundImage = 'none';
        }}
      />
    </picture>
  );
}

/**
 * Lazy-loaded image component for below-the-fold content
 */
export const LazyImage = lazy(() => 
  Promise.resolve({ default: OptimizedImage })
);

/**
 * Critical CSS inliner for above-the-fold content
 */
export function inlineCriticalCSS() {
  const criticalCSS = `
    /* Critical CSS for above-the-fold content */
    .hero-section { display: block; }
    .loading-spinner { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    /* Prevent layout shift */
    .navbar { height: 64px; }
    .sidebar { width: 256px; }
  `;
  
  const style = document.createElement('style');
  style.textContent = criticalCSS;
  style.setAttribute('data-critical', 'true');
  document.head.appendChild(style);
}

/**
 * Preload critical resources
 */
export function preloadCriticalResources() {
  const criticalResources = [
    // Preload critical fonts
    { href: '/fonts/inter-variable.woff2', as: 'font', type: 'font/woff2' },
    // Preload critical images
    { href: '/lovable-uploads/cc-favicon.png', as: 'image' },
    // Preload critical API endpoints
    { href: '/api/auth/session', as: 'fetch' }
  ];

  criticalResources.forEach(({ href, as, type }) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    if (type) link.type = type;
    if (as === 'font') link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}

/**
 * Service Worker registration for caching
 */
export function registerServiceWorker() {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('SW registered: ', registration);
      } catch (registrationError) {
        console.log('SW registration failed: ', registrationError);
      }
    });
  }
}

/**
 * Resource hints for better loading performance
 */
export function addResourceHints() {
  // DNS prefetch for external domains
  const dnsPrefetch = [
    'https://uyjryuopuqgmsvayiccl.supabase.co',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com'
  ];

  dnsPrefetch.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = domain;
    document.head.appendChild(link);
  });

  // Preconnect to critical origins
  const preconnect = [
    'https://uyjryuopuqgmsvayiccl.supabase.co',
    'https://fonts.gstatic.com'
  ];

  preconnect.forEach(origin => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}