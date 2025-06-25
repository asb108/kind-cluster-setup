import React, { useRef, useState, useEffect } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

type SectionAnimationType =
  | 'fade-in'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'zoom-in'
  | 'zoom-out'
  | 'flip-up'
  | 'flip-down'
  | 'stagger-children'
  | 'none';

interface AnimatedSectionProps {
  children: React.ReactNode;
  animation?: SectionAnimationType;
  className?: string;
  delay?: number;
  duration?: number;
  staggerChildren?: number;
  staggerDirection?: 'forward' | 'reverse';
  threshold?: number;
  once?: boolean;
  as?: React.ElementType;
  childClassName?: string;
  childrenAs?: React.ElementType;
  distance?: number;
  damping?: number;
  stiffness?: number;
  onAnimationStart?: () => void;
  onAnimationComplete?: () => void;
  disabled?: boolean;
}

export function AnimatedSection({
  children,
  animation = 'fade-in',
  className = '',
  delay = 0,
  duration = 0.5,
  staggerChildren = 0.1,
  staggerDirection = 'forward',
  threshold = 0.05,
  once = true,
  as: Component = 'div',
  childClassName = '',
  childrenAs: ChildComponent = 'div',
  distance = 50,
  damping = 25,
  stiffness = 300,
  onAnimationStart,
  onAnimationComplete,
  disabled = false,
}: AnimatedSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount: threshold });
  const [forceVisible, setForceVisible] = useState(false);

  // Fallback to ensure animations trigger even if viewport detection fails
  useEffect(() => {
    if (!isInView && !disabled) {
      const timer = setTimeout(() => {
        setForceVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isInView, disabled]);

  const shouldAnimate = isInView || forceVisible;

  // If animations are disabled, just render the children
  if (disabled) {
    return (
      <Component className={className}>
        {children}
      </Component>
    );
  }

  // Define container animation variants
  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerChildren,
        staggerDirection: staggerDirection === 'forward' ? 1 : -1,
        delayChildren: delay,
      }
    }
  };

  // Define child animation variants
  const getChildVariants = (): Variants => {
    switch (animation) {
      case 'fade-in':
        return {
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              duration,
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
              type: 'spring',
              damping,
              stiffness,
              duration,
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
              type: 'spring',
              damping,
              stiffness,
              duration,
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
              type: 'spring',
              damping,
              stiffness,
              duration,
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
              type: 'spring',
              damping,
              stiffness,
              duration,
            }
          }
        };
      case 'zoom-in':
        return {
          hidden: { opacity: 0, scale: 0.8 },
          visible: {
            opacity: 1,
            scale: 1,
            transition: {
              type: 'spring',
              damping,
              stiffness,
              duration,
            }
          }
        };
      case 'zoom-out':
        return {
          hidden: { opacity: 0, scale: 1.2 },
          visible: {
            opacity: 1,
            scale: 1,
            transition: {
              type: 'spring',
              damping,
              stiffness,
              duration,
            }
          }
        };
      case 'flip-up':
        return {
          hidden: { opacity: 0, rotateX: 90 },
          visible: {
            opacity: 1,
            rotateX: 0,
            transition: {
              type: 'spring',
              damping,
              stiffness,
              duration,
            }
          }
        };
      case 'flip-down':
        return {
          hidden: { opacity: 0, rotateX: -90 },
          visible: {
            opacity: 1,
            rotateX: 0,
            transition: {
              type: 'spring',
              damping,
              stiffness,
              duration,
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
  };

  const childVariants = getChildVariants();

  // For stagger-children animation, wrap each child in a motion component
  if (animation === 'stagger-children') {
    return (
      <motion.div
        ref={ref}
        className={className}
        initial="hidden"
        animate={shouldAnimate ? "visible" : "hidden"}
        variants={containerVariants}
        onAnimationStart={onAnimationStart}
        onAnimationComplete={onAnimationComplete}
      >
        {React.Children.map(children, (child, index) => (
          <motion.div
            key={index}
            className={childClassName}
            variants={childVariants}
            custom={index}
          >
            {child}
          </motion.div>
        ))}
      </motion.div>
    );
  }

  // For other animations, animate the container
  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={shouldAnimate ? "visible" : "hidden"}
      variants={childVariants}
      transition={{
        delay,
        duration,
        ease: 'easeOut',
      }}
      onAnimationStart={onAnimationStart}
      onAnimationComplete={onAnimationComplete}
    >
      <Component>
        {children}
      </Component>
    </motion.div>
  );
}
