import React from 'react';
import { devLogger } from '@/lib/performance/ConsoleReplacementUtility';

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
  // Check if this is an uploaded asset (skip modern format optimization for uploaded files)
  const isUploadedAsset = src.includes('/lovable-uploads/') || src.includes('/uploads/');
  
  // Generate modern image format URLs by replacing the extension (only for non-uploaded assets)
  const getModernFormatSrc = (originalSrc: string, format: 'webp' | 'avif') => {
    if (isUploadedAsset) return null; // Skip modern formats for uploaded assets
    const lastDotIndex = originalSrc.lastIndexOf('.');
    if (lastDotIndex === -1) return null;
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
      {/* AVIF format - most efficient (only for non-uploaded assets) */}
      {avifSrc && (
        <source 
          srcSet={avifSrc} 
          type="image/avif"
        />
      )}
      
      {/* WebP format - widely supported (only for non-uploaded assets) */}
      {webpSrc && (
        <source 
          srcSet={webpSrc} 
          type="image/webp"
        />
      )}
      
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
        onLoad={() => {
          console.log(`[OptimizedImage] Successfully loaded image: ${src}`);
          onLoad?.();
        }}
        onError={(e) => {
          devLogger.components.error(`Failed to load image: ${src}`, e);
          onError?.(e);
        }}
        style={commonStyle}
      />
    </picture>
  );
}