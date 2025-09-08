import React from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  fetchPriority?: 'high' | 'low' | 'auto';
  onLoad?: () => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

/**
 * Optimized image component with modern format support (WebP/AVIF) and fallbacks
 */
export function OptimizedImage({
  src,
  alt,
  className,
  width,
  height,
  priority = false,
  fetchPriority = 'auto',
  onLoad,
  onError
}: OptimizedImageProps) {
  // Generate modern image format URLs by replacing the extension
  const getModernFormatSrc = (originalSrc: string, format: 'webp' | 'avif') => {
    const lastDotIndex = originalSrc.lastIndexOf('.');
    if (lastDotIndex === -1) return originalSrc;
    return originalSrc.substring(0, lastDotIndex) + '.' + format;
  };

  const avifSrc = getModernFormatSrc(src, 'avif');
  const webpSrc = getModernFormatSrc(src, 'webp');

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
      {/* AVIF format - most efficient */}
      <source 
        srcSet={avifSrc} 
        type="image/avif"
      />
      
      {/* WebP format - widely supported */}
      <source 
        srcSet={webpSrc} 
        type="image/webp"
      />
      
      {/* Fallback to original format */}
      <img
        src={src}
        alt={alt}
        className={className}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={fetchPriority}
        decoding="async"
        onLoad={onLoad}
        onError={onError}
        style={commonStyle}
      />
    </picture>
  );
}