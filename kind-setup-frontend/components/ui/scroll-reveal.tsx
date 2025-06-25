'use client';

import React, { useRef, useMemo } from 'react';
import { motion, useInView } from 'framer-motion';
import type { Variants } from 'framer-motion';

type RevealAnimation =
  | 'fade-in'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'scale-up'
  | 'scale-down'
  | 'rotate'
  | 'flip-x'
  | 'flip-y'
  | 'none';

interface ScrollRevealProps {
  children: React.ReactNode;
  animation?: RevealAnimation;
  delay?: number;
  duration?: number;
  threshold?: number;
  once?: boolean;
  className?: string;
  distance?: number;
  damping?: number;
  stiffness?: number;
  as?: React.ElementType;
}

export function ScrollReveal({
  children,
  animation = 'fade-in',
  delay = 0,
  duration = 0.5,
  threshold = 0.1,
  once = true,
  className = '',
  distance = 50,
  damping = 25,
  stiffness = 300,
  as: Component = 'div',
}: ScrollRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount: threshold });

  // Define animation variants - memoized to prevent recalculation on each render
  const variants = useMemo((): Variants => {
    switch (animation) {
      case 'fade-in':
        return {
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              duration,
              delay,
              ease: 'easeOut',
            }
          }
        };
      case 'slide-up':
        return {
          hidden: { opacity: 0, y: distance },
          visible: {
            opacity: 1,
            y: 0,
            transition: {
              duration,
              delay,
              ease: 'easeOut',
            }
          }
        };
      case 'slide-down':
        return {
          hidden: { opacity: 0, y: -distance },
          visible: {
            opacity: 1,
            y: 0,
            transition: {
              duration,
              delay,
              ease: 'easeOut',
            }
          }
        };
      case 'slide-left':
        return {
          hidden: { opacity: 0, x: distance },
          visible: {
            opacity: 1,
            x: 0,
            transition: {
              duration,
              delay,
              ease: 'easeOut',
            }
          }
        };
      case 'slide-right':
        return {
          hidden: { opacity: 0, x: -distance },
          visible: {
            opacity: 1,
            x: 0,
            transition: {
              duration,
              delay,
              ease: 'easeOut',
            }
          }
        };
      case 'scale-up':
        return {
          hidden: { opacity: 0, scale: 0.95 },
          visible: {
            opacity: 1,
            scale: 1,
            transition: {
              duration,
              delay,
              ease: 'easeOut',
            }
          }
        };
      case 'scale-down':
        return {
          hidden: { opacity: 0, scale: 1.05 },
          visible: {
            opacity: 1,
            scale: 1,
            transition: {
              duration,
              delay,
              ease: 'easeOut',
            }
          }
        };
      case 'rotate':
        return {
          hidden: { opacity: 0, rotate: -5 },
          visible: {
            opacity: 1,
            rotate: 0,
            transition: {
              duration,
              delay,
              ease: 'easeOut',
            }
          }
        };
      case 'flip-x':
        return {
          hidden: { opacity: 0, rotateX: 45 },
          visible: {
            opacity: 1,
            rotateX: 0,
            transition: {
              duration,
              delay,
              ease: 'easeOut',
            }
          }
        };
      case 'flip-y':
        return {
          hidden: { opacity: 0, rotateY: 45 },
          visible: {
            opacity: 1,
            rotateY: 0,
            transition: {
              duration,
              delay,
              ease: 'easeOut',
            }
          }
        };
      case 'none':
      default:
        return {
          hidden: {},
          visible: {}
        };
    }
  }, [animation, distance, duration, delay]);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={variants}
    >
      <Component>
        {children}
      </Component>
    </motion.div>
  );
}

interface StaggeredRevealProps {
  children: React.ReactNode;
  animation?: RevealAnimation;
  staggerDelay?: number;
  initialDelay?: number;
  duration?: number;
  threshold?: number;
  once?: boolean;
  className?: string;
  itemClassName?: string;
  distance?: number;
  as?: React.ElementType;
}

export function StaggeredReveal({
  children,
  animation = 'fade-in',
  staggerDelay = 0.1,
  initialDelay = 0,
  duration = 0.5,
  threshold = 0.1,
  once = true,
  className = '',
  itemClassName = '',
  distance = 50,
  as: Component = 'div',
}: StaggeredRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount: threshold });

  // Define animation variants for container - memoized to prevent recalculation
  const containerVariants = useMemo(() => ({
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: initialDelay,
      }
    }
  }), [staggerDelay, initialDelay]);

  // Define animation variants for items - memoized to prevent recalculation
  const itemVariants = useMemo((): Variants => {
    switch (animation) {
      case 'fade-in':
        return {
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { duration, ease: 'easeOut' }
          }
        };
      case 'slide-up':
        return {
          hidden: { opacity: 0, y: distance },
          visible: {
            opacity: 1,
            y: 0,
            transition: { duration, ease: 'easeOut' }
          }
        };
      case 'slide-down':
        return {
          hidden: { opacity: 0, y: -distance },
          visible: {
            opacity: 1,
            y: 0,
            transition: { duration, ease: 'easeOut' }
          }
        };
      case 'slide-left':
        return {
          hidden: { opacity: 0, x: distance },
          visible: {
            opacity: 1,
            x: 0,
            transition: { duration, ease: 'easeOut' }
          }
        };
      case 'slide-right':
        return {
          hidden: { opacity: 0, x: -distance },
          visible: {
            opacity: 1,
            x: 0,
            transition: { duration, ease: 'easeOut' }
          }
        };
      case 'scale-up':
        return {
          hidden: { opacity: 0, scale: 0.95 },
          visible: {
            opacity: 1,
            scale: 1,
            transition: { duration, ease: 'easeOut' }
          }
        };
      case 'scale-down':
        return {
          hidden: { opacity: 0, scale: 1.05 },
          visible: {
            opacity: 1,
            scale: 1,
            transition: { duration, ease: 'easeOut' }
          }
        };
      case 'none':
      default:
        return {
          hidden: {},
          visible: {}
        };
    }
  }, [animation, distance, duration]);

  // Wrap children with motion.div and apply animation - memoized to prevent recreation on each render
  const renderedChildren = useMemo(() => {
    return React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) return child;

      return (
        <motion.div
          className={itemClassName}
          variants={itemVariants}
        >
          {child}
        </motion.div>
      );
    });
  }, [children, itemClassName, itemVariants]);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={containerVariants}
    >
      <Component>
        {renderedChildren}
      </Component>
    </motion.div>
  );
}
