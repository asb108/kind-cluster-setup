'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedNavItemProps {
  href: string;
  label: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'subtle' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  activeIndicator?: boolean;
  indicatorPosition?: 'left' | 'right' | 'bottom' | 'top';
  children?: React.ReactNode;
}

export function AnimatedNavItem({
  href,
  label,
  icon,
  isActive = false,
  onClick,
  variant = 'default',
  size = 'md',
  className,
  activeIndicator = true,
  indicatorPosition = 'right',
  children,
}: AnimatedNavItemProps) {
  // Size classes
  const sizeClasses = {
    sm: 'text-xs py-1.5 px-2 gap-x-2',
    md: 'text-sm py-2 px-3 gap-x-3',
    lg: 'text-base py-2.5 px-4 gap-x-3',
  };

  // Variant classes
  const variantClasses = {
    default: isActive
      ? 'bg-primary/10 text-primary shadow-sm'
      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
    subtle: isActive
      ? 'bg-muted/50 text-foreground shadow-sm'
      : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground',
    ghost: isActive
      ? 'text-primary'
      : 'text-muted-foreground hover:text-foreground',
    outline: isActive
      ? 'border border-primary/30 text-primary bg-primary/5'
      : 'border border-border text-muted-foreground hover:border-primary/20 hover:text-foreground',
  };

  // Icon classes
  const iconClasses = {
    default: isActive
      ? 'text-primary bg-primary/10'
      : 'text-muted-foreground group-hover:text-foreground group-hover:bg-muted/50',
    subtle: isActive
      ? 'text-foreground bg-muted/30'
      : 'text-muted-foreground group-hover:text-foreground group-hover:bg-muted/20',
    ghost: isActive
      ? 'text-primary'
      : 'text-muted-foreground group-hover:text-foreground',
    outline: isActive
      ? 'text-primary'
      : 'text-muted-foreground group-hover:text-foreground',
  };

  // Animation variants
  const containerVariants = {
    hover: {
      x: 4,
      transition: { duration: 0.2 },
    },
    tap: {
      scale: 0.98,
      transition: { duration: 0.1 },
    },
  };

  const iconVariants = {
    initial: { scale: 1 },
    hover: {
      scale: 1.15,
      rotate: [0, -5, 5, 0],
      transition: { duration: 0.3 },
    },
  };

  // Indicator position
  const getIndicatorClass = () => {
    switch (indicatorPosition) {
      case 'left':
        return 'left-0 h-full w-1 rounded-full';
      case 'right':
        return 'right-0 h-full w-1 rounded-full';
      case 'top':
        return 'top-0 w-full h-1 rounded-full';
      case 'bottom':
        return 'bottom-0 w-full h-1 rounded-full';
      default:
        return 'right-0 h-full w-1 rounded-full';
    }
  };

  return (
    <motion.div whileHover='hover' whileTap='tap' variants={containerVariants}>
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          'group relative flex items-center rounded-md font-medium transition-all',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
      >
        {icon && (
          <motion.div
            variants={iconVariants}
            className={cn(
              'transition-colors flex items-center justify-center p-1 rounded-md',
              iconClasses[variant]
            )}
          >
            {icon}
          </motion.div>
        )}

        {children || <span>{label}</span>}

        {/* Active indicator with animation */}
        {activeIndicator && isActive && (
          <motion.div
            layoutId={`nav-indicator-${indicatorPosition}`}
            className={cn('absolute bg-primary', getIndicatorClass())}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
          />
        )}
      </Link>
    </motion.div>
  );
}
