import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  animate?: boolean;
}

export function DashboardLayout({
  children,
  title,
  description,
  actions,
  className,
  animate = true,
}: DashboardLayoutProps) {
  const content = (
    <div className={cn('p-6 md:p-8 max-w-7xl mx-auto', className)}>
      <div className='flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-primary-gradient'>
            {title}
          </h1>
          {description && (
            <p className='text-muted-foreground mt-1'>{description}</p>
          )}
        </div>
        {actions && <div className='flex items-center gap-3'>{actions}</div>}
      </div>
      <ScrollArea className='h-[calc(100vh-12rem)] pr-4'>{children}</ScrollArea>
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

interface DashboardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
}

export function DashboardGrid({ children, columns = 2 }: DashboardGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  };

  return (
    <div
      className={`grid ${gridCols[columns]} gap-4 sm:gap-6 md:gap-8 lg:gap-10`}
    >
      {children}
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  className?: string;
  animate?: boolean;
}

export function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
  className,
  animate = true,
}: StatsCardProps) {
  // Determine which variant of dashboard card is being used
  const isPrimary = className?.includes('dashboard-card-primary');
  const isSecondary = className?.includes('dashboard-card-secondary');
  const isTertiary = className?.includes('dashboard-card-tertiary');
  const isSuccess = className?.includes('dashboard-card-success');

  // Set icon background and text colors based on variant
  const getIconClasses = () => {
    if (isPrimary)
      return 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300';
    if (isSecondary)
      return 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300';
    if (isTertiary)
      return 'bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-300';
    if (isSuccess)
      return 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300';
    return 'bg-primary/10 text-primary';
  };

  // Set text colors based on variant
  const getTitleClasses = () => {
    if (isPrimary) return 'text-indigo-900 dark:text-white';
    if (isSecondary) return 'text-blue-900 dark:text-white';
    if (isTertiary) return 'text-teal-900 dark:text-white';
    if (isSuccess) return 'text-green-900 dark:text-white';
    return 'text-foreground';
  };

  const getValueClasses = () => {
    if (isPrimary) return 'text-indigo-900 dark:text-white';
    if (isSecondary) return 'text-blue-900 dark:text-white';
    if (isTertiary) return 'text-teal-900 dark:text-white';
    if (isSuccess) return 'text-green-900 dark:text-white';
    return 'text-foreground';
  };

  const getDescriptionClasses = () => {
    if (isPrimary) return 'text-indigo-700 dark:text-indigo-200';
    if (isSecondary) return 'text-blue-700 dark:text-blue-200';
    if (isTertiary) return 'text-teal-700 dark:text-teal-200';
    if (isSuccess) return 'text-green-700 dark:text-green-200';
    return 'text-muted-foreground';
  };

  // Get card background styles based on variant
  const getCardStyles = () => {
    const baseStyles = 'overflow-hidden relative shadow-lg border-0';

    if (isPrimary)
      return cn(
        baseStyles,
        'bg-gradient-to-br from-white to-indigo-50 dark:from-indigo-950 dark:to-indigo-900'
      );
    if (isSecondary)
      return cn(
        baseStyles,
        'bg-gradient-to-br from-white to-blue-50 dark:from-blue-950 dark:to-blue-900'
      );
    if (isTertiary)
      return cn(
        baseStyles,
        'bg-gradient-to-br from-white to-teal-50 dark:from-teal-950 dark:to-teal-900'
      );
    if (isSuccess)
      return cn(
        baseStyles,
        'bg-gradient-to-br from-white to-green-50 dark:from-green-950 dark:to-green-900'
      );

    return baseStyles;
  };

  // Add decorative top border based on variant
  const getTopBorderStyles = () => {
    if (isPrimary)
      return 'before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-indigo-500 before:to-indigo-400';
    if (isSecondary)
      return 'before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-blue-500 before:to-blue-400';
    if (isTertiary)
      return 'before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-teal-500 before:to-teal-400';
    if (isSuccess)
      return 'before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-green-500 before:to-green-400';

    return '';
  };

  const content = (
    <Card className={cn(getCardStyles(), getTopBorderStyles(), className)}>
      <CardContent className='p-8'>
        <div className='flex justify-between items-start'>
          <div className='flex-1'>
            <p className={cn('text-lg font-bold', getTitleClasses())}>
              {title}
            </p>
            <h3
              className={cn('text-4xl font-extrabold mt-3', getValueClasses())}
            >
              {value}
            </h3>
            {description && (
              <p
                className={cn(
                  'text-base font-medium mt-4',
                  getDescriptionClasses()
                )}
              >
                {description}
              </p>
            )}
            {trend && (
              <div className='flex items-center mt-5'>
                <Badge
                  variant={trend.positive ? 'default' : 'destructive'}
                  className={cn(
                    'text-sm px-3 py-1.5 font-bold rounded-full',
                    trend.positive
                      ? 'bg-green-100 text-green-800 border-green-500 dark:bg-green-900 dark:text-green-100'
                      : 'bg-red-100 text-red-800 border-red-500 dark:bg-red-900 dark:text-red-100'
                  )}
                >
                  {trend.positive ? '↑' : '↓'} {trend.value}%
                </Badge>
                <span
                  className={cn(
                    'text-sm font-semibold ml-2',
                    getDescriptionClasses()
                  )}
                >
                  {trend.label}
                </span>
              </div>
            )}
          </div>
          {icon && (
            <div className={cn('p-5 rounded-full', getIconClasses())}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Get hover animation styles based on variant
  const getHoverAnimation = () => {
    const baseHover = {
      y: -8,
      transition: { duration: 0.3 },
      boxShadow:
        '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    };

    if (isPrimary)
      return {
        ...baseHover,
        boxShadow:
          '0 20px 25px -5px rgba(79, 70, 229, 0.2), 0 10px 10px -5px rgba(79, 70, 229, 0.1)',
      };

    if (isSecondary)
      return {
        ...baseHover,
        boxShadow:
          '0 20px 25px -5px rgba(37, 99, 235, 0.2), 0 10px 10px -5px rgba(37, 99, 235, 0.1)',
      };

    if (isTertiary)
      return {
        ...baseHover,
        boxShadow:
          '0 20px 25px -5px rgba(20, 184, 166, 0.2), 0 10px 10px -5px rgba(20, 184, 166, 0.1)',
      };

    if (isSuccess)
      return {
        ...baseHover,
        boxShadow:
          '0 20px 25px -5px rgba(34, 197, 94, 0.2), 0 10px 10px -5px rgba(34, 197, 94, 0.1)',
      };

    return baseHover;
  };

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.5,
          ease: [0.25, 0.1, 0.25, 1.0], // Improved easing curve
        }}
        whileHover={getHoverAnimation()}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}
