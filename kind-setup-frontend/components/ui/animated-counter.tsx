import React, { useState, useEffect, useRef } from 'react';
import { motion, useSpring, useInView } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  formatValue?: (value: number) => string;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  easing?:
    | 'linear'
    | 'easeIn'
    | 'easeOut'
    | 'easeInOut'
    | 'circIn'
    | 'circOut'
    | 'circInOut'
    | 'backIn'
    | 'backOut'
    | 'backInOut';
  delay?: number;
  triggerOnce?: boolean;
  threshold?: number;
}

export function AnimatedCounter({
  value,
  duration = 2,
  formatValue,
  className = '',
  prefix = '',
  suffix = '',
  decimals = 0,
  easing = 'easeOut',
  delay = 0,
  triggerOnce = true,
  threshold = 0.1,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: triggerOnce, amount: threshold });

  // Create a spring animation for smooth counting
  const springValue = useSpring(0, {
    stiffness: 80,
    damping: 25,
    duration: duration * 1000,
  });

  // Update the spring value when the target value changes or comes into view
  useEffect(() => {
    if (isInView) {
      springValue.set(value);
    }
  }, [value, isInView, springValue]);

  // Update the displayed value based on the spring animation
  useEffect(() => {
    const unsubscribe = springValue.onChange(latest => {
      setDisplayValue(latest);
    });

    return unsubscribe;
  }, [springValue]);

  // Format the value for display
  const getFormattedValue = () => {
    if (formatValue) {
      return formatValue(displayValue);
    }

    // Default formatting with specified decimals
    return displayValue.toFixed(decimals);
  };

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 5 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 5 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
    >
      {prefix}
      {getFormattedValue()}
      {suffix}
    </motion.span>
  );
}

interface AnimatedStatisticProps extends AnimatedCounterProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  titleClassName?: string;
  valueClassName?: string;
  descriptionClassName?: string;
  trendClassName?: string;
  iconClassName?: string;
}

export function AnimatedStatistic({
  title,
  value,
  description,
  icon,
  trend,
  className = '',
  titleClassName = '',
  valueClassName = '',
  descriptionClassName = '',
  trendClassName = '',
  iconClassName = '',
  ...counterProps
}: AnimatedStatisticProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <motion.div
      ref={ref}
      className={`p-6 rounded-lg border border-border bg-card ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className='flex items-start justify-between'>
        <div>
          <h3
            className={`text-sm font-medium text-muted-foreground mb-1 ${titleClassName}`}
          >
            {title}
          </h3>

          <div className={`text-3xl md:text-4xl font-bold ${valueClassName}`}>
            <AnimatedCounter value={value} {...counterProps} />
          </div>

          {description && (
            <p
              className={`text-sm text-muted-foreground mt-1 ${descriptionClassName}`}
            >
              {description}
            </p>
          )}

          {trend && (
            <div className={`flex items-center mt-2 ${trendClassName}`}>
              <span
                className={`text-xs font-medium ${trend.positive ? 'text-success' : 'text-error'}`}
              >
                {trend.positive ? '↑' : '↓'} {trend.value}%
              </span>
              <span className='text-xs text-muted-foreground ml-1'>
                {trend.label}
              </span>
            </div>
          )}
        </div>

        {icon && (
          <motion.div
            className={`p-3 rounded-full bg-primary/10 ${iconClassName}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={
              isInView ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }
            }
            transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
          >
            {icon}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
