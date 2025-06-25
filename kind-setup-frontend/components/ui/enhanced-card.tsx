'use client';
import React from 'react';

import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EnhancedCardProps {
  children: React.ReactNode;
  title?: string;
  icon?: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
  variant?: 'default' | 'glass' | 'gradient' | 'outline';
  hover?: boolean;
  animate?: boolean;
}

export function EnhancedCard({
  children,
  title,
  icon,
  className = '',
  footer,
  headerAction,
  variant = 'default',
  hover = true,
  animate = true,
}: EnhancedCardProps) {
  // Variant-specific classes
  const variantClasses = {
    default: 'bg-card border border-border shadow-sm',
    glass:
      'bg-white/80 dark:bg-card/80 backdrop-blur-md border border-white/20 dark:border-white/5 shadow-sm',
    gradient: 'gradient-border bg-card shadow-sm',
    outline: 'bg-transparent border border-primary/20 hover:border-primary/40',
  };

  // Hover classes
  const hoverClasses = hover
    ? 'transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/30'
    : '';

  // Combine all classes
  const cardClasses = cn(
    'overflow-hidden',
    variantClasses[variant],
    hoverClasses,
    className
  );

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
  };

  // Content to render
  const content = (
    <Card className={cardClasses}>
      {(title || icon || headerAction) && (
        <CardHeader className='flex flex-row items-center justify-between p-5 space-y-0 border-b border-border/50'>
          <div className='flex items-center gap-3'>
            {icon && (
              <div className='p-2.5 rounded-md bg-primary/15 text-primary'>
                {icon}
              </div>
            )}
            {title && (
              <CardTitle className='text-xl font-bold text-foreground'>
                {title}
              </CardTitle>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </CardHeader>
      )}
      <CardContent className='p-6 space-y-4'>{children}</CardContent>
      {footer && (
        <CardFooter className='p-5 border-t border-border/50 bg-muted/30'>
          {footer}
        </CardFooter>
      )}
    </Card>
  );

  // If animate is true, wrap the Card in motion.div
  if (animate) {
    return (
      <motion.div initial='hidden' animate='visible' variants={cardVariants}>
        {content}
      </motion.div>
    );
  }

  // If animate is false, just return the Card
  return content;
}
