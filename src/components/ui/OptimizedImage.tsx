import React from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  onLoad?: () => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

/**
 * Optimized image component that prevents layout shifts and improves performance
 */
export function OptimizedImage({
  src,
  alt,
  className,
  width,
  height,
  priority = false,
  onLoad,
  onError
}: OptimizedImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onLoad={onLoad}
      onError={onError}
      style={{
        maxWidth: '100%',
        height: 'auto'
      }}
    />
  );
}