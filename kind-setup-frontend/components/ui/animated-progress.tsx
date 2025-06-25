import React, { useRef, useEffect } from 'react';
import { motion, useInView, useAnimation, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

type ProgressVariant = 'default' | 'gradient' | 'striped' | 'glow' | 'segments';

type ProgressSize = 'xs' | 'sm' | 'md' | 'lg';

type ProgressColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

interface AnimatedProgressProps {
  value: number;
  max?: number;
  variant?: ProgressVariant;
  size?: ProgressSize;
  color?: ProgressColor;
  showValue?: boolean;
  valuePosition?: 'top' | 'right' | 'inside';
  className?: string;
  barClassName?: string;
  valueClassName?: string;
  animate?: boolean;
  animationDuration?: number;
  animationDelay?: number;
  label?: string;
  labelPosition?: 'top' | 'left';
  segmentCount?: number;
  segmentGap?: number;
  rounded?: boolean;
  showAnimation?: boolean;
  onAnimationComplete?: () => void;
}

export function AnimatedProgress({
  value,
  max = 100,
  variant = 'default',
  size = 'md',
  color = 'primary',
  showValue = false,
  valuePosition = 'right',
  className = '',
  barClassName = '',
  valueClassName = '',
  animate = true,
  animationDuration = 1,
  animationDelay = 0,
  label,
  labelPosition = 'top',
  segmentCount = 10,
  segmentGap = 4,
  rounded = true,
  showAnimation = true,
  onAnimationComplete,
}: AnimatedProgressProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 }); // Reduced threshold for better triggering
  const controls = useAnimation();

  // Calculate percentage
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100);

  // Size classes
  const sizeClasses = {
    xs: 'h-1',
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  // Color classes
  const getColorClasses = () => {
    switch (variant) {
      case 'gradient':
        return {
          primary: 'bg-gradient-to-r from-primary to-primary-dark',
          secondary: 'bg-gradient-to-r from-secondary to-secondary-dark',
          tertiary: 'bg-gradient-to-r from-tertiary to-tertiary-dark',
          success: 'bg-gradient-to-r from-success to-success-light',
          warning: 'bg-gradient-to-r from-warning to-warning-light',
          error: 'bg-gradient-to-r from-error to-error-light',
          info: 'bg-gradient-to-r from-info to-info-light',
        };
      default:
        return {
          primary: 'bg-primary',
          secondary: 'bg-secondary',
          tertiary: 'bg-tertiary',
          success: 'bg-success',
          warning: 'bg-warning',
          error: 'bg-error',
          info: 'bg-info',
        };
    }
  };

  const colorClasses = getColorClasses();

  // Start animation when in view or after a timeout as fallback
  useEffect(() => {
    if (isInView && animate) {
      controls.start('visible');
    } else if (animate) {
      // Fallback: start animation after a short delay even if not in view
      const timer = setTimeout(() => {
        controls.start('visible');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isInView, controls, animate]);

  // Animation variants
  const progressVariants: Variants = {
    hidden: { width: '0%' },
    visible: {
      width: `${percentage}%`,
      transition: {
        duration: animationDuration,
        delay: animationDelay,
        ease: 'easeOut',
      },
    },
  };

  // Render segments for segmented progress bar
  const renderSegments = () => {
    const segments = [];
    const segmentWidth = (100 - segmentGap * (segmentCount - 1)) / segmentCount;
    const filledSegments = Math.ceil((percentage / 100) * segmentCount);

    for (let i = 0; i < segmentCount; i++) {
      const isFilled = i < filledSegments;
      segments.push(
        <motion.div
          key={i}
          className={cn(
            'h-full rounded',
            isFilled ? colorClasses[color] : 'bg-muted'
          )}
          style={{ width: `${segmentWidth}%` }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: isInView ? 1 : 0,
            scale: isInView ? 1 : 0.8,
          }}
          transition={{
            duration: 0.3,
            delay: animationDelay + i * 0.05,
          }}
        />
      );
    }

    return <div className='flex w-full h-full justify-between'>{segments}</div>;
  };

  // Render progress bar based on variant
  const renderProgressBar = () => {
    switch (variant) {
      case 'striped':
        return (
          <motion.div
            className={cn(
              'h-full progress-bar-striped',
              colorClasses[color],
              rounded && 'rounded-full',
              barClassName
            )}
            initial='hidden'
            animate={controls}
            variants={progressVariants}
            onAnimationComplete={onAnimationComplete}
          />
        );
      case 'glow':
        return (
          <motion.div
            className={cn(
              'h-full shadow-glow',
              colorClasses[color],
              rounded && 'rounded-full',
              barClassName
            )}
            style={{
              boxShadow: `0 0 10px ${
                color === 'primary'
                  ? 'var(--primary)'
                  : color === 'secondary'
                    ? 'var(--secondary)'
                    : color === 'tertiary'
                      ? 'var(--tertiary)'
                      : color === 'success'
                        ? 'var(--success)'
                        : color === 'warning'
                          ? 'var(--warning)'
                          : color === 'error'
                            ? 'var(--error)'
                            : 'var(--info)'
              }`,
            }}
            initial='hidden'
            animate={controls}
            variants={progressVariants}
            onAnimationComplete={onAnimationComplete}
          />
        );
      case 'segments':
        return renderSegments();
      default:
        return (
          <motion.div
            className={cn(
              'h-full',
              colorClasses[color],
              rounded && 'rounded-full',
              barClassName
            )}
            initial='hidden'
            animate={controls}
            variants={progressVariants}
            onAnimationComplete={onAnimationComplete}
          />
        );
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {(label || (showValue && valuePosition === 'top')) && (
        <div
          className={cn(
            'flex mb-1',
            labelPosition === 'left' ? 'justify-between' : 'flex-col'
          )}
        >
          {label && <span className='text-sm font-medium'>{label}</span>}
          {showValue && valuePosition === 'top' && (
            <span className={cn('text-sm', valueClassName)}>
              {value}
              {max !== 100 && `/${max}`}
            </span>
          )}
        </div>
      )}

      <div
        ref={ref}
        className={cn(
          'w-full bg-muted overflow-hidden',
          sizeClasses[size],
          rounded && 'rounded-full',
          valuePosition === 'inside' && 'relative'
        )}
      >
        {renderProgressBar()}

        {showValue && valuePosition === 'inside' && (
          <div className='absolute inset-0 flex items-center justify-center'>
            <span className={cn('text-xs font-medium', valueClassName)}>
              {value}
              {max !== 100 && `/${max}`}
            </span>
          </div>
        )}
      </div>

      {showValue && valuePosition === 'right' && (
        <div className='flex justify-end mt-1'>
          <span className={cn('text-sm', valueClassName)}>
            {value}
            {max !== 100 && `/${max}`}
          </span>
        </div>
      )}
    </div>
  );
}
