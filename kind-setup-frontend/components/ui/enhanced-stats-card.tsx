import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { AnimatedText } from '@/components/ui/animated-text';
import { AnimatedProgress } from '@/components/ui/animated-progress';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

interface EnhancedStatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  progress?: {
    value: number;
    max?: number;
    variant?: 'default' | 'gradient' | 'striped' | 'glow' | 'segments';
    color?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'error' | 'info';
  };
  sparkline?: number[];
  className?: string;
  animate?: boolean;
  expandable?: boolean;
  expandedContent?: React.ReactNode;
  loading?: boolean;
  onRefresh?: () => void;
  variant?: 'default' | 'gradient' | 'outline' | 'glass';
  color?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'error' | 'info';
  hoverEffect?: 'raise' | 'scale' | 'glow' | 'border' | 'none';
  onClick?: () => void;
  footer?: React.ReactNode;
}

export function EnhancedStatsCard({
  title,
  value,
  description,
  icon,
  trend,
  progress,
  sparkline,
  className = '',
  animate = true,
  expandable = false,
  expandedContent,
  loading = false,
  onRefresh,
  variant = 'default',
  color = 'primary',
  hoverEffect = 'raise',
  onClick,
  footer,
}: EnhancedStatsCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Determine if value is a number that can be animated
  const isNumericValue = typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)));
  const numericValue = isNumericValue ? Number(value) : 0;

  // Get variant classes
  const getVariantClasses = () => {
    switch (variant) {
      case 'gradient':
        return `bg-gradient-to-br ${
          color === 'primary' ? 'from-primary/10 to-primary/5' :
          color === 'secondary' ? 'from-secondary/10 to-secondary/5' :
          color === 'tertiary' ? 'from-tertiary/10 to-tertiary/5' :
          color === 'success' ? 'from-success/10 to-success/5' :
          color === 'warning' ? 'from-warning/10 to-warning/5' :
          color === 'error' ? 'from-error/10 to-error/5' :
          'from-info/10 to-info/5'
        } border-0`;
      case 'outline':
        return `bg-transparent border ${
          color === 'primary' ? 'border-primary/30' :
          color === 'secondary' ? 'border-secondary/30' :
          color === 'tertiary' ? 'border-tertiary/30' :
          color === 'success' ? 'border-success/30' :
          color === 'warning' ? 'border-warning/30' :
          color === 'error' ? 'border-error/30' :
          'border-info/30'
        }`;
      case 'glass':
        return 'bg-white/80 dark:bg-card/80 backdrop-blur-md border border-white/20 dark:border-white/5';
      default:
        return '';
    }
  };

  // Get hover effect classes
  const getHoverClasses = () => {
    switch (hoverEffect) {
      case 'raise':
        return 'transition-all duration-300 hover:-translate-y-1 hover:shadow-md';
      case 'scale':
        return 'transition-all duration-300 hover:scale-[1.02] hover:shadow-md';
      case 'glow':
        return `transition-all duration-300 hover:shadow-[0_0_15px_rgba(var(--${color}-rgb),0.3)]`;
      case 'border':
        return `transition-all duration-300 hover:border-${color}/50`;
      case 'none':
      default:
        return '';
    }
  };

  // Render sparkline if provided
  const renderSparkline = () => {
    if (!sparkline || sparkline.length < 2) return null;

    const max = Math.max(...sparkline);
    const min = Math.min(...sparkline);
    const range = max - min || 1;
    const points = sparkline.map((value, index) => {
      const x = (index / (sparkline.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="mt-2 h-10">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <motion.polyline
            points={points}
            fill="none"
            strokeWidth="2"
            stroke={`var(--${color})`}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.2 }}
          />
          {/* Add dots at each data point */}
          {sparkline.map((value, index) => {
            const x = (index / (sparkline.length - 1)) * 100;
            const y = 100 - ((value - min) / range) * 100;
            return (
              <motion.circle
                key={index}
                cx={x}
                cy={y}
                r="1.5"
                fill={`var(--${color})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.5 + (index * 0.1) }}
              />
            );
          })}
        </svg>
      </div>
    );
  };

  // Card content
  const cardContent = (
    <>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <AnimatedText
              text={title}
              animation="fade"
              className="text-base font-semibold text-foreground"
              duration={0.5}
              delay={0.1}
              animateOnView={animate}
              once={true}
            />

            <div className="mt-2">
              {isNumericValue && animate ? (
                <AnimatedCounter
                  value={numericValue}
                  className="text-3xl font-bold text-foreground"
                  duration={1.5}
                  delay={0.2}
                />
              ) : (
                <AnimatedText
                  text={value.toString()}
                  animation="fade"
                  className="text-3xl font-bold text-foreground"
                  duration={0.5}
                  delay={0.2}
                  animateOnView={animate}
                  once={true}
                />
              )}
            </div>

            {description && (
              <AnimatedText
                text={description}
                animation="fade"
                className="text-base text-muted-foreground font-medium mt-2"
                duration={0.5}
                delay={0.3}
                animateOnView={animate}
                once={true}
              />
            )}

            {trend && (
              <div className="flex items-center mt-3">
                <Badge
                  variant={trend.positive ? "default" : "destructive"}
                  className={cn(
                    "text-sm px-2 py-1",
                    trend.positive ? "bg-success/15 text-success border-success/40" : "bg-error/15 text-error border-error/40"
                  )}
                >
                  {trend.positive ? '↑' : '↓'} {trend.value}%
                </Badge>
                <span className="text-sm text-muted-foreground font-medium ml-2">
                  {trend.label}
                </span>
              </div>
            )}

            {progress && (
              <div className="mt-3">
                <AnimatedProgress
                  value={progress.value}
                  max={progress.max}
                  variant={progress.variant}
                  color={progress.color || color}
                  size="sm"
                  animate={animate}
                  animationDuration={1}
                  animationDelay={0.4}
                  showValue
                  valuePosition="right"
                />
              </div>
            )}

            {sparkline && renderSparkline()}
          </div>

          {icon && (
            <motion.div
              className={cn(
                "p-3 rounded-full",
                `bg-${color}/10 text-${color}`
              )}
              initial={animate ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              {icon}
            </motion.div>
          )}

          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 ml-2"
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          )}
        </div>

        {expandable && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show More
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>

      <AnimatePresence>
        {expanded && expandedContent && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6">
              {expandedContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {footer && (
        <div className="px-6 py-3 border-t border-border bg-muted/30">
          {footer}
        </div>
      )}
    </>
  );

  return (
    <Card
      className={cn(
        "overflow-hidden relative",
        getVariantClasses(),
        getHoverClasses(),
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {cardContent}

      {/* Add a subtle gradient border at the bottom */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 h-1",
        `bg-gradient-to-r from-${color}/60 to-${color}/30`,
        "opacity-50"
      )} />
    </Card>
  );
}
