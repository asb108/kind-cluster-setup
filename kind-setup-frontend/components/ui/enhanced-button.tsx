'use client';
import React from 'react';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '../../lib/utils';

type ButtonVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'link'
  | 'destructive';
type ButtonSize = 'sm' | 'default' | 'lg' | 'icon';

interface EnhancedButtonProps extends React.ComponentProps<typeof Button> {
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
  animate?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function EnhancedButton({
  children,
  variant = 'default',
  size = 'default',
  icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  className = '',
  animate = true,
  ...props
}: EnhancedButtonProps) {
  // Map our custom variants to Shadcn UI variants
  const mappedVariant = variant;

  // Width classes
  const widthClasses = fullWidth ? 'w-full' : '';

  // Gradient class
  const gradientClass = '';

  // Animation variants
  const buttonVariants = {
    tap: { scale: 0.98 },
    hover:
      variant === 'destructive' || variant === 'default'
        ? { y: -2, boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }
        : { y: -1 },
  };

  // Combine classes
  const buttonClasses = cn(
    widthClasses,
    gradientClass,
    variant === 'destructive' && 'hover:-translate-y-1 hover:shadow-md',
    className
  );

  // If animate is true, wrap the Button in motion.div
  if (animate) {
    return (
      <motion.div
        className='inline-block'
        whileTap='tap'
        whileHover='hover'
        variants={buttonVariants}
      >
        <Button
          variant={mappedVariant as any}
          size={size}
          className={buttonClasses}
          disabled={loading || props.disabled}
          {...props}
        >
          {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
          {!loading && icon && iconPosition === 'left' && (
            <span className='mr-2'>{icon}</span>
          )}
          {children}
          {!loading && icon && iconPosition === 'right' && (
            <span className='ml-2'>{icon}</span>
          )}
        </Button>
      </motion.div>
    );
  }

  // If animate is false, just return the Button
  return (
    <Button
      variant={mappedVariant as any}
      size={size}
      className={buttonClasses}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
      {!loading && icon && iconPosition === 'left' && (
        <span className='mr-2'>{icon}</span>
      )}
      {children}
      {!loading && icon && iconPosition === 'right' && (
        <span className='ml-2'>{icon}</span>
      )}
    </Button>
  );
}
