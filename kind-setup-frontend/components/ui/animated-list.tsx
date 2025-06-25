import React, { useRef, useMemo } from 'react';
import { motion, useInView } from 'framer-motion';
import type { Variants } from 'framer-motion';

interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
  itemClassName?: string;
  staggerDelay?: number;
  animation?: 'fade' | 'slide-up' | 'slide-right' | 'scale' | 'none';
  duration?: number;
  once?: boolean;
  threshold?: number;
  as?: React.ElementType;
}

export function AnimatedList({
  children,
  className = '',
  itemClassName = '',
  staggerDelay = 0.1,
  animation = 'fade',
  duration = 0.5,
  once = true,
  threshold = 0.1,
  as: Component = 'ul',
}: AnimatedListProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount: threshold });

  // Animation variants - memoized to prevent recalculation on each render
  const itemVariants = useMemo((): Variants => {
    switch (animation) {
      case 'slide-up':
        return {
          hidden: { opacity: 0, y: 10 },
          visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
              delay: i * staggerDelay,
              duration,
              ease: 'easeOut',
            },
          }),
        };
      case 'slide-right':
        return {
          hidden: { opacity: 0, x: -10 },
          visible: (i: number) => ({
            opacity: 1,
            x: 0,
            transition: {
              delay: i * staggerDelay,
              duration,
              ease: 'easeOut',
            },
          }),
        };
      case 'scale':
        return {
          hidden: { opacity: 0, scale: 0.95 },
          visible: (i: number) => ({
            opacity: 1,
            scale: 1,
            transition: {
              delay: i * staggerDelay,
              duration,
              ease: 'easeOut',
            },
          }),
        };
      case 'fade':
        return {
          hidden: { opacity: 0 },
          visible: (i: number) => ({
            opacity: 1,
            transition: {
              delay: i * staggerDelay,
              duration,
              ease: 'easeOut',
            },
          }),
        };
      case 'none':
      default:
        return {
          hidden: {},
          visible: {},
        };
    }
  }, [animation, staggerDelay, duration]);

  // Memoize container variants
  const containerVariants = useMemo(
    () => ({
      hidden: {},
      visible: {
        transition: {
          staggerChildren: staggerDelay,
        },
      },
    }),
    [staggerDelay]
  );

  // Wrap children with motion.div and apply animation - memoized to prevent recreation on each render
  const renderedChildren = useMemo(() => {
    return React.Children.map(children, (child, index) => {
      if (!React.isValidElement(child)) return child;

      return (
        <motion.li
          className={itemClassName}
          custom={index}
          variants={itemVariants}
          initial='hidden'
          animate={isInView ? 'visible' : 'hidden'}
          exit='hidden'
        >
          {child}
        </motion.li>
      );
    });
  }, [children, itemClassName, itemVariants, isInView]);

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={containerVariants}
      initial='hidden'
      animate={isInView ? 'visible' : 'hidden'}
      exit='hidden'
    >
      <Component>{renderedChildren}</Component>
    </motion.div>
  );
}

interface AnimatedListItemProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  animation?: 'fade' | 'slide-up' | 'slide-right' | 'scale' | 'none';
  duration?: number;
  once?: boolean;
  threshold?: number;
}

export function AnimatedListItem({
  children,
  className = '',
  delay = 0,
  animation = 'fade',
  duration = 0.5,
  once = true,
  threshold = 0.1,
}: AnimatedListItemProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount: threshold });

  // Animation variants - memoized to prevent recalculation on each render
  const variants = useMemo((): Variants => {
    switch (animation) {
      case 'slide-up':
        return {
          hidden: { opacity: 0, y: 10 },
          visible: {
            opacity: 1,
            y: 0,
            transition: {
              delay,
              duration,
              ease: 'easeOut',
            },
          },
        };
      case 'slide-right':
        return {
          hidden: { opacity: 0, x: -10 },
          visible: {
            opacity: 1,
            x: 0,
            transition: {
              delay,
              duration,
              ease: 'easeOut',
            },
          },
        };
      case 'scale':
        return {
          hidden: { opacity: 0, scale: 0.95 },
          visible: {
            opacity: 1,
            scale: 1,
            transition: {
              delay,
              duration,
              ease: 'easeOut',
            },
          },
        };
      case 'fade':
        return {
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              delay,
              duration,
              ease: 'easeOut',
            },
          },
        };
      case 'none':
      default:
        return {
          hidden: {},
          visible: {},
        };
    }
  }, [animation, delay, duration]);

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={variants}
      initial='hidden'
      animate={isInView ? 'visible' : 'hidden'}
      exit='hidden'
    >
      {children}
    </motion.div>
  );
}
