import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

type TransitionVariant = 
  | 'fade' 
  | 'slide-up' 
  | 'slide-down' 
  | 'slide-left' 
  | 'slide-right' 
  | 'scale' 
  | 'rotate' 
  | 'flip';

interface PageTransitionProps {
  children: React.ReactNode;
  variant?: TransitionVariant;
  duration?: number;
  className?: string;
  exitBeforeEnter?: boolean;
}

export function PageTransition({
  children,
  variant = 'fade',
  duration = 0.3,
  className = '',
  exitBeforeEnter = true,
}: PageTransitionProps) {
  const pathname = usePathname();
  const [renderKey, setRenderKey] = useState(pathname);
  
  useEffect(() => {
    setRenderKey(pathname);
  }, [pathname]);
  
  // Define animation variants
  const getVariants = () => {
    switch (variant) {
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
          initial: { opacity: 0, scale: 0.9 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 1.1 },
        };
      case 'rotate':
        return {
          initial: { opacity: 0, rotate: -5 },
          animate: { opacity: 1, rotate: 0 },
          exit: { opacity: 0, rotate: 5 },
        };
      case 'flip':
        return {
          initial: { opacity: 0, rotateX: -15 },
          animate: { opacity: 1, rotateX: 0 },
          exit: { opacity: 0, rotateX: 15 },
        };
      default:
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
        };
    }
  };
  
  const variants = getVariants();
  
  return (
    <AnimatePresence mode={exitBeforeEnter ? 'wait' : 'sync'}>
      <motion.div
        key={renderKey}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={variants}
        transition={{ 
          duration, 
          ease: [0.22, 1, 0.36, 1] // Custom cubic-bezier for smooth transitions
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
