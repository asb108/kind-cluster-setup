import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedHoverCardProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
  contentClassName?: string;
  showArrow?: boolean;
  maxWidth?: string;
  offset?: number;
  interactive?: boolean;
  animationVariant?: 'fade' | 'scale' | 'slide' | 'flip';
}

export function AnimatedHoverCard({
  children,
  content,
  position = 'top',
  delay = 150,
  className = '',
  contentClassName = '',
  showArrow = true,
  maxWidth = '300px',
  offset = 8,
  interactive = false,
  animationVariant = 'scale',
}: AnimatedHoverCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutId) clearTimeout(timeoutId);

    const id = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }

    if (!interactive) {
      setIsVisible(false);
    }
  };

  const handleCardMouseEnter = () => {
    if (interactive) {
      setIsVisible(true);
    }
  };

  const handleCardMouseLeave = () => {
    setIsVisible(false);
  };

  // Position classes
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  // Arrow classes
  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-foreground border-l-transparent border-r-transparent border-b-transparent',
    bottom:
      'bottom-full left-1/2 -translate-x-1/2 border-b-foreground border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-foreground border-t-transparent border-b-transparent border-r-transparent',
    right:
      'right-full top-1/2 -translate-y-1/2 border-r-foreground border-t-transparent border-b-transparent border-l-transparent',
  };

  // Animation variants
  const getAnimationVariants = () => {
    const baseVariants = {
      exit: {
        opacity: 0,
        transition: { duration: 0.15, ease: 'easeOut' },
      },
    };

    switch (animationVariant) {
      case 'fade':
        return {
          hidden: { opacity: 0 },
          visible: { opacity: 1 },
          ...baseVariants,
        };
      case 'scale':
        return {
          hidden: { opacity: 0, scale: 0.9 },
          visible: { opacity: 1, scale: 1 },
          ...baseVariants,
        };
      case 'slide':
        return {
          hidden: {
            opacity: 0,
            ...(position === 'top' && { y: 10 }),
            ...(position === 'bottom' && { y: -10 }),
            ...(position === 'left' && { x: 10 }),
            ...(position === 'right' && { x: -10 }),
          },
          visible: {
            opacity: 1,
            y: 0,
            x: 0,
          },
          ...baseVariants,
        };
      case 'flip':
        return {
          hidden: {
            opacity: 0,
            ...(position === 'top' || position === 'bottom'
              ? { rotateX: position === 'top' ? -30 : 30 }
              : { rotateY: position === 'left' ? 30 : -30 }),
          },
          visible: {
            opacity: 1,
            rotateX: 0,
            rotateY: 0,
          },
          ...baseVariants,
        };
      default:
        return {
          hidden: { opacity: 0, scale: 0.9 },
          visible: { opacity: 1, scale: 1 },
          ...baseVariants,
        };
    }
  };

  const animationVariants = getAnimationVariants();

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={`absolute z-50 ${positionClasses[position]}`}
            style={{
              ...(position === 'top' && { marginBottom: offset }),
              ...(position === 'bottom' && { marginTop: offset }),
              ...(position === 'left' && { marginRight: offset }),
              ...(position === 'right' && { marginLeft: offset }),
            }}
            initial='hidden'
            animate='visible'
            exit='exit'
            variants={animationVariants}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 30,
            }}
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}
          >
            <div
              className={`bg-card dark:bg-card-dark border border-border rounded-lg shadow-elevated overflow-hidden ${contentClassName}`}
              style={{ maxWidth }}
            >
              {content}
            </div>

            {showArrow && (
              <div
                className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
