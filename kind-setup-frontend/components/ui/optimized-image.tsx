'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from '../../lib/utils';
import { getOptimizedImageProps } from '@/lib/image-optimization';
import type { OptimizedImageProps } from '@/lib/image-optimization';

interface OptimizedImageComponentProps extends OptimizedImageProps {
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority,
  placeholder,
  loading,
  fallbackSrc = '/images/placeholder.svg',
  onLoad,
  onError,
  ...props
}: OptimizedImageComponentProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const optimizedProps = getOptimizedImageProps({
    src: error ? fallbackSrc : src,
    alt,
    width,
    height,
    className,
    priority,
    placeholder,
    loading,
  });

  const handleError = () => {
    if (!error) {
      setError(true);
      onError?.();
    }
  };

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <Image
        {...optimizedProps}
        className={cn(
          'transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        onError={handleError}
        onLoad={handleLoad}
        {...props}
      />

      {!loaded && <div className='absolute inset-0 bg-muted animate-pulse' />}
    </div>
  );
}
