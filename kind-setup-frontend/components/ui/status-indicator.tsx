import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '../../lib/utils';

type StatusType =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'pending'
  | 'inactive';

interface StatusIndicatorProps {
  status: StatusType;
  text: string;
  size?: 'sm' | 'md' | 'lg';
  withDot?: boolean;
  className?: string;
}

export function StatusIndicator({
  status,
  text,
  size = 'md',
  withDot = true,
  className = '',
}: StatusIndicatorProps) {
  // Map status to variant
  const variantMap: Record<
    StatusType,
    'default' | 'secondary' | 'destructive' | 'outline'
  > = {
    success: 'default',
    warning: 'secondary',
    error: 'destructive',
    info: 'outline',
    pending: 'outline',
    inactive: 'outline',
  };

  // Custom colors for statuses that don't map directly to variants
  const customColors = {
    success: 'bg-success/15 text-success border-success/30 hover:bg-success/15',
    warning: 'bg-warning/15 text-warning border-warning/30 hover:bg-warning/15',
    info: 'bg-info/15 text-info border-info/30 hover:bg-info/15',
    pending: 'bg-primary/15 text-primary border-primary/30 hover:bg-primary/15',
    inactive:
      'bg-muted text-muted-foreground border-muted-foreground/30 hover:bg-muted',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm',
    lg: 'text-base px-3 py-1.5',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <Badge
      variant={
        status === 'success' || status === 'error'
          ? variantMap[status]
          : 'outline'
      }
      className={cn(
        sizeClasses[size],
        status !== 'success' && status !== 'error' && customColors[status],
        className
      )}
    >
      {withDot && (
        <span
          className={cn(
            dotSizes[size],
            'rounded-full mr-1.5 inline-block',
            status === 'pending' && 'animate-pulse'
          )}
          style={{ backgroundColor: 'currentColor' }}
        />
      )}
      {text}
    </Badge>
  );
}

import { motion } from 'framer-motion';

interface StatusTimelineProps {
  steps: {
    label: string;
    status: StatusType;
    timestamp?: string;
    description?: string;
  }[];
  animate?: boolean;
}

export function StatusTimeline({ steps, animate = true }: StatusTimelineProps) {
  const content = (
    <div className='space-y-4'>
      {steps.map((step, index) => (
        <div key={index} className='flex'>
          <div className='flex flex-col items-center mr-4'>
            <div
              className={cn(
                'rounded-full w-4 h-4',
                step.status === 'success' && 'bg-success',
                step.status === 'pending' && 'bg-primary animate-pulse',
                step.status === 'error' && 'bg-destructive',
                step.status === 'warning' && 'bg-warning',
                step.status === 'info' && 'bg-info',
                step.status === 'inactive' && 'bg-muted'
              )}
            />
            {index < steps.length - 1 && (
              <div className='h-full w-0.5 bg-border mt-1' />
            )}
          </div>
          <div className='pb-5'>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='font-medium'>{step.label}</span>
              {step.timestamp && (
                <Badge variant='outline' className='text-xs font-normal'>
                  {step.timestamp}
                </Badge>
              )}
            </div>
            {step.description && (
              <p className='text-sm text-muted-foreground mt-1'>
                {step.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1 }}
      >
        {steps.map((_, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {content}
          </motion.div>
        ))}
      </motion.div>
    );
  }

  return content;
}
