import React, { useRef, useEffect, useState } from 'react';
import { motion, useInView, useAnimation, type Variants } from 'framer-motion';
import { cn } from '../../lib/utils';

type TextAnimationType =
  | 'fade'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'typewriter'
  | 'wave'
  | 'bounce'
  | 'gradient'
  | 'highlight'
  | 'none';

interface AnimatedTextProps {
  text: string;
  animation?: TextAnimationType;
  className?: string;
  delay?: number;
  duration?: number;
  staggerChildren?: number;
  once?: boolean;
  threshold?: number;
  as?: React.ElementType;
  color?: string;
  highlightColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  animateOnHover?: boolean;
  animateOnView?: boolean;
  repeat?: boolean;
  repeatDelay?: number;
  onAnimationComplete?: () => void;
}

export function AnimatedText({
  text,
  animation = 'fade',
  className = '',
  delay = 0,
  duration = 0.5,
  staggerChildren = 0.03,
  once = true,
  threshold = 0.1,
  as: Component = 'span',
  color = 'currentColor',
  highlightColor = 'var(--primary)',
  gradientFrom = 'var(--primary)',
  gradientTo = 'var(--secondary)',
  animateOnHover = false,
  animateOnView = true,
  repeat = false,
  repeatDelay = 3,
  onAnimationComplete,
}: AnimatedTextProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount: threshold });
  const controls = useAnimation();
  const [isHovered, setIsHovered] = useState(false);

  // Split text into words or characters based on animation type
  const splitText = () => {
    if (['typewriter', 'wave', 'bounce'].includes(animation)) {
      return text.split('');
    }
    return text.split(' ');
  };

  const textArray = splitText();

  // Define animation variants
  const containerVariants: Variants = {
    hidden: {},
    visible: (i = 1) => ({
      transition: {
        staggerChildren: staggerChildren,
        delayChildren: delay,
        ...(repeat && { repeat: Infinity, repeatDelay }),
      },
    }),
  };

  // Define child animation variants
  const getChildVariants = (): Variants => {
    switch (animation) {
      case 'fade':
        return {
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { duration },
          },
        };
      case 'slide-up':
        return {
          hidden: { opacity: 0, y: 20 },
          visible: {
            opacity: 1,
            y: 0,
            transition: { duration },
          },
        };
      case 'slide-down':
        return {
          hidden: { opacity: 0, y: -20 },
          visible: {
            opacity: 1,
            y: 0,
            transition: { duration },
          },
        };
      case 'slide-left':
        return {
          hidden: { opacity: 0, x: -20 },
          visible: {
            opacity: 1,
            x: 0,
            transition: { duration },
          },
        };
      case 'slide-right':
        return {
          hidden: { opacity: 0, x: 20 },
          visible: {
            opacity: 1,
            x: 0,
            transition: { duration },
          },
        };
      case 'typewriter':
        return {
          hidden: { opacity: 0, y: 20 },
          visible: {
            opacity: 1,
            y: 0,
            transition: {
              type: 'spring',
              damping: 12,
              stiffness: 200,
              duration: duration / 2,
            },
          },
        };
      case 'wave':
        return {
          hidden: { y: 0 },
          visible: (i: number) => ({
            y: [0, -10, 0],
            transition: {
              duration: duration,
              times: [0, 0.5, 1],
              ease: 'easeInOut',
              delay: i * staggerChildren,
              ...(repeat && { repeat: Infinity, repeatDelay: 0.5 }),
            },
          }),
        };
      case 'bounce':
        return {
          hidden: { scale: 1 },
          visible: (i: number) => ({
            scale: [1, 1.2, 1],
            transition: {
              duration: duration,
              times: [0, 0.5, 1],
              ease: 'easeInOut',
              delay: i * staggerChildren,
              ...(repeat && { repeat: Infinity, repeatDelay: 0.5 }),
            },
          }),
        };
      case 'gradient':
      case 'highlight':
        return {
          hidden: {},
          visible: {},
        };
      case 'none':
      default:
        return {
          hidden: {},
          visible: {},
        };
    }
  };

  const childVariants = getChildVariants();

  // Handle animation control
  useEffect(() => {
    if (
      (animateOnView && isInView) ||
      (animateOnHover && isHovered) ||
      (!animateOnView && !animateOnHover)
    ) {
      controls.start('visible').then(() => {
        if (onAnimationComplete) onAnimationComplete();
      });
    } else if (animateOnHover && !isHovered) {
      controls.start('hidden');
    }
  }, [
    controls,
    isInView,
    isHovered,
    animateOnView,
    animateOnHover,
    onAnimationComplete,
  ]);

  // Special case for gradient and highlight animations
  if (animation === 'gradient') {
    return (
      <Component
        ref={ref}
        className={cn(
          'bg-clip-text text-transparent bg-gradient-to-r transition-all duration-500',
          className
        )}
        style={{
          backgroundImage: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})`,
          opacity:
            (animateOnView && isInView) ||
            (animateOnHover && isHovered) ||
            (!animateOnView && !animateOnHover)
              ? 1
              : 0,
          transform:
            (animateOnView && isInView) ||
            (animateOnHover && isHovered) ||
            (!animateOnView && !animateOnHover)
              ? 'translateY(0)'
              : 'translateY(10px)',
          transition: `opacity ${duration}s ease-out, transform ${duration}s ease-out`,
          transitionDelay: `${delay}s`,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {text}
      </Component>
    );
  }

  if (animation === 'highlight') {
    return (
      <Component
        ref={ref}
        className={cn('relative inline-block', className)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span style={{ color }}>{text}</span>
        <motion.span
          className='absolute bottom-0 left-0 w-full h-[30%] -z-10 origin-left'
          style={{ backgroundColor: highlightColor }}
          initial={{ scaleX: 0 }}
          animate={{
            scaleX:
              (animateOnView && isInView) ||
              (animateOnHover && isHovered) ||
              (!animateOnView && !animateOnHover)
                ? 1
                : 0,
          }}
          transition={{
            duration,
            delay,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      </Component>
    );
  }

  // Default animation with staggered children
  return (
    <motion.div
      ref={ref}
      className={cn('inline-flex flex-wrap', className)}
      variants={containerVariants}
      initial='hidden'
      animate={controls}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {textArray.map((word, index) => (
        <motion.span
          key={index}
          custom={index}
          variants={childVariants}
          style={{
            display: 'inline-block',
            marginRight: animation === 'typewriter' ? 0 : '0.25em',
            color,
          }}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
}
