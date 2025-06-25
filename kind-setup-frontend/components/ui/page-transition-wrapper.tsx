import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type TransitionEffect =
  | 'fade'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'scale'
  | 'flip'
  | 'rotate'
  | 'none';

interface PageTransitionWrapperProps {
  children: React.ReactNode;
  effect?: TransitionEffect;
  duration?: number;
  className?: string;
  exitBeforeEnter?: boolean;
  onAnimationStart?: () => void;
  onAnimationComplete?: () => void;
  disabled?: boolean;
}

export function PageTransitionWrapper({
  children,
  effect = 'fade',
  duration = 0.3,
  className = '',
  exitBeforeEnter = true,
  onAnimationStart,
  onAnimationComplete,
  disabled = false,
}: PageTransitionWrapperProps) {
  const pathname = usePathname();
  const [renderKey, setRenderKey] = useState(pathname);

  useEffect(() => {
    setRenderKey(pathname || '');
  }, [pathname]);

  // Define animation variants based on the effect
  const getVariants = () => {
    switch (effect) {
      case 'fade':
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
        };
      case 'slide-up':
        return {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -20 },
        };
      case 'slide-down':
        return {
          initial: { opacity: 0, y: -20 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: 20 },
        };
      case 'slide-left':
        return {
          initial: { opacity: 0, x: 20 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -20 },
        };
      case 'slide-right':
        return {
          initial: { opacity: 0, x: -20 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: 20 },
        };
      case 'scale':
        return {
          initial: { opacity: 0, scale: 0.95 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 1.05 },
        };
      case 'flip':
        return {
          initial: { opacity: 0, rotateY: -10 },
          animate: { opacity: 1, rotateY: 0 },
          exit: { opacity: 0, rotateY: 10 },
        };
      case 'rotate':
        return {
          initial: { opacity: 0, rotate: -2 },
          animate: { opacity: 1, rotate: 0 },
          exit: { opacity: 0, rotate: 2 },
        };
      case 'none':
        return {
          initial: {},
          animate: {},
          exit: {},
        };
      default:
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
        };
    }
  };

  // If transitions are disabled, just render the children
  if (disabled) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence
      mode={exitBeforeEnter ? 'wait' : 'sync'}
      onExitComplete={() => onAnimationComplete?.()}
    >
      <motion.div
        key={renderKey}
        initial='initial'
        animate='animate'
        exit='exit'
        variants={getVariants()}
        transition={{
          duration,
          ease: [0.22, 1, 0.36, 1], // Custom cubic-bezier for smooth transitions
        }}
        className={cn('w-full', className)}
        onAnimationStart={() => onAnimationStart?.()}
        onAnimationComplete={() => onAnimationComplete?.()}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Higher-order component to wrap pages with transition effects
export function withPageTransition<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<PageTransitionWrapperProps, 'children'> = {}
) {
  const WithPageTransition = (props: P) => {
    return (
      <PageTransitionWrapper {...options}>
        <Component {...props} />
      </PageTransitionWrapper>
    );
  };

  WithPageTransition.displayName = `WithPageTransition(${Component.displayName || Component.name || 'Component'})`;

  return WithPageTransition;
}
