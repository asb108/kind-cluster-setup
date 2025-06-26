import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'card' | 'text' | 'circle' | 'button' | 'image';
  width?: string | number;
  height?: string | number;
  animated?: boolean;
  shimmer?: boolean;
  rounded?: boolean | string;
}

export function Skeleton({
  className = '',
  variant = 'default',
  width,
  height,
  animated = true,
  shimmer = true,
  rounded = true,
}: SkeletonProps) {
  // Get variant-specific classes
  const getVariantClasses = () => {
    switch (variant) {
      case 'card':
        return 'w-full h-32';
      case 'text':
        return 'w-full h-4';
      case 'circle':
        return 'rounded-full';
      case 'button':
        return 'h-10 rounded-md';
      case 'image':
        return 'w-full aspect-video';
      default:
        return '';
    }
  };

  // Get rounded classes
  const getRoundedClasses = () => {
    if (typeof rounded === 'string') {
      return `rounded-${rounded}`;
    }

    if (rounded === true) {
      return variant === 'circle' ? 'rounded-full' : 'rounded-md';
    }

    return '';
  };

  return (
    <div
      className={cn(
        'bg-muted/60',
        animated && 'animate-pulse',
        shimmer && 'animate-shimmer',
        getVariantClasses(),
        getRoundedClasses(),
        className
      )}
      style={{
        width:
          width !== undefined
            ? typeof width === 'number'
              ? `${width}px`
              : width
            : undefined,
        height:
          height !== undefined
            ? typeof height === 'number'
              ? `${height}px`
              : height
            : undefined,
      }}
    />
  );
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
  lineClassName?: string;
  lastLineWidth?: string | number;
  animated?: boolean;
  shimmer?: boolean;
  spacing?: 'tight' | 'normal' | 'loose';
  widths?: (string | number)[];
}

export function SkeletonText({
  lines = 3,
  className = '',
  lineClassName = '',
  lastLineWidth = '60%',
  animated = true,
  shimmer = true,
  spacing = 'normal',
  widths,
}: SkeletonTextProps) {
  // Get spacing classes
  const getSpacingClasses = () => {
    switch (spacing) {
      case 'tight':
        return 'space-y-1';
      case 'loose':
        return 'space-y-3';
      default:
        return 'space-y-2';
    }
  };

  return (
    <div className={cn('flex flex-col', getSpacingClasses(), className)}>
      {Array.from({ length: lines }).map((_, index) => {
        const isLast = index === lines - 1;
        const width = widths ? widths[index] : isLast ? lastLineWidth : '100%';

        return (
          <Skeleton
            key={index}
            variant='text'
            width={width}
            className={lineClassName}
            animated={animated}
            shimmer={shimmer}
          />
        );
      })}
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
  header?: boolean;
  footer?: boolean;
  headerHeight?: string | number;
  footerHeight?: string | number;
  contentHeight?: string | number;
  animated?: boolean;
  shimmer?: boolean;
  rounded?: boolean | string;
}

export function SkeletonCard({
  className = '',
  header = true,
  footer = false,
  headerHeight = '2rem',
  footerHeight = '3rem',
  contentHeight = '8rem',
  animated = true,
  shimmer = true,
  rounded = true,
}: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'border bg-card overflow-hidden',
        typeof rounded === 'string'
          ? `rounded-${rounded}`
          : rounded
            ? 'rounded-lg'
            : '',
        className
      )}
    >
      {header && (
        <div
          className='border-b'
          style={{
            height:
              typeof headerHeight === 'number'
                ? `${headerHeight}px`
                : headerHeight,
          }}
        >
          <div className='p-4'>
            <Skeleton
              width='40%'
              height='1rem'
              animated={animated}
              shimmer={shimmer}
            />
          </div>
        </div>
      )}

      <div
        className='p-4'
        style={{
          height:
            typeof contentHeight === 'number'
              ? `${contentHeight}px`
              : contentHeight,
        }}
      >
        <SkeletonText lines={3} animated={animated} shimmer={shimmer} />
      </div>

      {footer && (
        <div
          className='border-t'
          style={{
            height:
              typeof footerHeight === 'number'
                ? `${footerHeight}px`
                : footerHeight,
          }}
        >
          <div className='p-4 flex justify-end'>
            <Skeleton
              variant='button'
              width={100}
              animated={animated}
              shimmer={shimmer}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface SkeletonStatsCardProps {
  className?: string;
  animated?: boolean;
  shimmer?: boolean;
  showIcon?: boolean;
  showProgress?: boolean;
  showTrend?: boolean;
}

export function SkeletonStatsCard({
  className = '',
  animated = true,
  shimmer = true,
  showIcon = true,
  showProgress = false,
  showTrend = false,
}: SkeletonStatsCardProps) {
  return (
    <div className={cn('border rounded-lg p-6 bg-card', className)}>
      <div className='flex justify-between items-start'>
        <div className='space-y-3 flex-1'>
          <Skeleton
            width='40%'
            height='0.875rem'
            animated={animated}
            shimmer={shimmer}
          />

          <Skeleton
            width='30%'
            height='1.5rem'
            animated={animated}
            shimmer={shimmer}
          />

          <Skeleton
            width='60%'
            height='0.875rem'
            animated={animated}
            shimmer={shimmer}
          />

          {showTrend && (
            <div className='flex items-center mt-2 space-x-2'>
              <Skeleton
                width={40}
                height='1.25rem'
                rounded='full'
                animated={animated}
                shimmer={shimmer}
              />
              <Skeleton
                width={80}
                height='0.75rem'
                animated={animated}
                shimmer={shimmer}
              />
            </div>
          )}

          {showProgress && (
            <div className='mt-3'>
              <Skeleton
                width='100%'
                height='0.5rem'
                rounded='full'
                animated={animated}
                shimmer={shimmer}
              />
            </div>
          )}
        </div>

        {showIcon && (
          <Skeleton
            variant='circle'
            width={40}
            height={40}
            animated={animated}
            shimmer={shimmer}
          />
        )}
      </div>
    </div>
  );
}

interface SkeletonTableProps {
  className?: string;
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  showPagination?: boolean;
  animated?: boolean;
  shimmer?: boolean;
}

export function SkeletonTable({
  className = '',
  rows = 5,
  columns = 4,
  showHeader = true,
  showPagination = true,
  animated = true,
  shimmer = true,
}: SkeletonTableProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className='rounded-md border'>
        <div className='divide-y'>
          {showHeader && (
            <div className='bg-muted/30 p-4'>
              <div className='grid grid-cols-12 gap-4'>
                {Array.from({ length: columns }).map((_, index) => (
                  <div
                    key={`header-${index}`}
                    className={`col-span-${12 / columns}`}
                  >
                    <Skeleton
                      height='1.25rem'
                      animated={animated}
                      shimmer={shimmer}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={`row-${rowIndex}`} className='p-4'>
              <div className='grid grid-cols-12 gap-4'>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <div
                    key={`cell-${rowIndex}-${colIndex}`}
                    className={`col-span-${12 / columns}`}
                  >
                    <Skeleton
                      height='1rem'
                      width={`${Math.floor(Math.random() * 40) + 60}%`}
                      animated={animated}
                      shimmer={shimmer}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showPagination && (
        <div className='flex items-center justify-between'>
          <Skeleton
            width={150}
            height='1rem'
            animated={animated}
            shimmer={shimmer}
          />

          <div className='flex space-x-2'>
            <Skeleton
              width={100}
              height='2rem'
              rounded='md'
              animated={animated}
              shimmer={shimmer}
            />
            <Skeleton
              width={100}
              height='2rem'
              rounded='md'
              animated={animated}
              shimmer={shimmer}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className='space-y-8'>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        <SkeletonStatsCard showTrend />
        <SkeletonStatsCard showProgress />
        <SkeletonStatsCard />
        <SkeletonStatsCard showTrend showProgress />
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2'>
          <SkeletonCard contentHeight='20rem' header footer />
        </div>
        <div>
          <SkeletonCard contentHeight='20rem' header />
        </div>
      </div>
    </div>
  );
}
