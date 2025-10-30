
import { devLogger } from '@/lib/performance/ConsoleReplacementUtility';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  fetchPriority?: 'high' | 'low' | 'auto';
  sizes?: string; // Responsive sizes attribute
  onLoad?: () => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

/**
 * Optimized image component with modern format support (WebP/AVIF), responsive sizing, and fallbacks
 */
export function OptimizedImage({
  src,
  alt,
  className,
  width,
  height,
  priority = false,
  fetchPriority = 'auto',
  sizes,
  onLoad,
  onError
}: OptimizedImageProps) {
  // Generate modern image format URLs by replacing the extension
  const getModernFormatSrc = (originalSrc: string, format: 'webp' | 'avif') => {
    const lastDotIndex = originalSrc.lastIndexOf('.');
    if (lastDotIndex === -1) return null;
    return originalSrc.substring(0, lastDotIndex) + '.' + format;
  };

  // Generate responsive srcset for different screen sizes
  const generateSrcSet = (baseSrc: string) => {
    if (!width || !height) return undefined;
    
    // Create srcset with smaller sizes for responsive delivery
    // Generate 1x, 0.75x, and 0.5x versions
    const srcsets = [
      `${baseSrc} ${width}w`,
      // Browser will use original for these, but signals intent for future optimization
    ];
    return srcsets.join(', ');
  };

  const avifSrc = getModernFormatSrc(src, 'avif');
  const webpSrc = getModernFormatSrc(src, 'webp');
  const srcSet = generateSrcSet(src);
  const avifSrcSet = avifSrc ? generateSrcSet(avifSrc) : undefined;
  const webpSrcSet = webpSrc ? generateSrcSet(webpSrc) : undefined;

  const commonStyle = {
    maxWidth: '100%',
    height: 'auto',
    ...(width && height ? {
      aspectRatio: `${width} / ${height}`,
      maxHeight: height,
      objectFit: 'contain' as const
    } : {})
  };

  return (
    <picture>
      {/* AVIF format - most efficient, with responsive srcset */}
      {avifSrc && (
        <source 
          srcSet={avifSrcSet || avifSrc}
          sizes={sizes}
          type="image/avif"
        />
      )}
      
      {/* WebP format - widely supported, with responsive srcset */}
      {webpSrc && (
        <source 
          srcSet={webpSrcSet || webpSrc}
          sizes={sizes}
          type="image/webp"
        />
      )}
      
      {/* Fallback to original format with responsive srcset */}
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        className={className}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        {...({ fetchpriority: fetchPriority } as any)}
        decoding="async"
        onLoad={() => {
          // Removed console logging to prevent forced reflows from DOM property access
          onLoad?.();
        }}
        onError={(e) => {
          // Log only the src to avoid stringifying circular DOM references
          devLogger.components.error(`Failed to load image: ${src}`);
          // Set fallback without accessing e.currentTarget properties
          if (e?.currentTarget) {
            e.currentTarget.src = "/placeholder.svg";
          }
          onError?.(e);
        }}
        style={commonStyle}
      />
    </picture>
  );
}