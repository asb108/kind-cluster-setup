import React, { useState } from 'react';
import { motion, type MotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

type IconAnimationType =
  | 'pulse'
  | 'spin'
  | 'bounce'
  | 'shake'
  | 'wiggle'
  | 'ping'
  | 'float'
  | 'scale'
  | 'rotate'
  | 'none';

interface AnimatedIconProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ReactNode;
  animation?: IconAnimationType;
  hoverAnimation?: IconAnimationType;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  color?: string;
  hoverColor?: string;
  className?: string;
  containerClassName?: string;
  duration?: number;
  repeat?: boolean | number;
  repeatType?: 'loop' | 'reverse' | 'mirror';
  delay?: number;
  onClick?: () => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  onAnimationComplete?: () => void;
  disabled?: boolean;
  tooltip?: string;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  tooltipClassName?: string;
  motionProps?: MotionProps;
}

export function AnimatedIcon({
  icon,
  animation = 'none',
  hoverAnimation = 'scale',
  size = 'md',
  color,
  hoverColor,
  className = '',
  containerClassName = '',
  duration = 1,
  repeat = false,
  repeatType = 'loop',
  delay = 0,
  onClick,
  onHoverStart,
  onHoverEnd,
  onAnimationComplete,
  disabled = false,
  tooltip,
  tooltipPosition = 'top',
  tooltipClassName = '',
  motionProps,
  ...props
}: AnimatedIconProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Size classes
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
    '2xl': 'w-10 h-10',
  };

  // Get animation variants based on animation type
  const getAnimationVariants = (type: IconAnimationType) => {
    switch (type) {
      case 'pulse':
        return {
          animate: {
            scale: [1, 1.1, 1],
            opacity: [1, 0.8, 1],
            transition: {
              duration,
              ease: 'easeInOut',
              times: [0, 0.5, 1],
              repeat: repeat
                ? typeof repeat === 'number'
                  ? repeat
                  : Infinity
                : 0,
              repeatType: repeatType as 'loop' | 'reverse' | 'mirror',
              delay,
            },
          },
        };
      case 'spin':
        return {
          animate: {
            rotate: 360,
            transition: {
              duration,
              ease: 'linear',
              repeat: repeat
                ? typeof repeat === 'number'
                  ? repeat
                  : Infinity
                : 0,
              repeatType: 'loop' as 'loop' | 'reverse' | 'mirror',
              delay,
            },
          },
        };
      case 'bounce':
        return {
          animate: {
            y: [0, -8, 0],
            transition: {
              duration,
              ease: 'easeInOut',
              times: [0, 0.5, 1],
              repeat: repeat
                ? typeof repeat === 'number'
                  ? repeat
                  : Infinity
                : 0,
              repeatType: repeatType as 'loop' | 'reverse' | 'mirror',
              delay,
            },
          },
        };
      case 'shake':
        return {
          animate: {
            x: [0, -5, 5, -5, 5, 0],
            transition: {
              duration: duration * 0.8,
              ease: 'easeInOut',
              times: [0, 0.2, 0.4, 0.6, 0.8, 1],
              repeat: repeat
                ? typeof repeat === 'number'
                  ? repeat
                  : Infinity
                : 0,
              repeatType: repeatType as 'loop' | 'reverse' | 'mirror',
              delay,
            },
          },
        };
      case 'wiggle':
        return {
          animate: {
            rotate: [0, -10, 10, -10, 10, 0],
            transition: {
              duration: duration * 0.8,
              ease: 'easeInOut',
              times: [0, 0.2, 0.4, 0.6, 0.8, 1],
              repeat: repeat
                ? typeof repeat === 'number'
                  ? repeat
                  : Infinity
                : 0,
              repeatType: repeatType as 'loop' | 'reverse' | 'mirror',
              delay,
            },
          },
        };
      case 'ping':
        return {
          animate: {
            scale: [1, 1.2, 1],
            opacity: [1, 0.8, 1],
            transition: {
              duration: duration * 0.5,
              ease: 'easeInOut',
              times: [0, 0.5, 1],
              repeat: repeat
                ? typeof repeat === 'number'
                  ? repeat
                  : Infinity
                : 0,
              repeatType: repeatType as 'loop' | 'reverse' | 'mirror',
              delay,
            },
          },
        };
      case 'float':
        return {
          animate: {
            y: [0, -5, 0],
            transition: {
              duration: duration * 2,
              ease: 'easeInOut',
              times: [0, 0.5, 1],
              repeat: repeat
                ? typeof repeat === 'number'
                  ? repeat
                  : Infinity
                : 0,
              repeatType: repeatType as 'loop' | 'reverse' | 'mirror',
              delay,
            },
          },
        };
      case 'scale':
        return {
          animate: {
            scale: 1.1,
            transition: {
              duration: duration * 0.3,
              ease: 'easeOut',
            },
          },
        };
      case 'rotate':
        return {
          animate: {
            rotate: 10,
            transition: {
              duration: duration * 0.3,
              ease: 'easeOut',
            },
          },
        };
      case 'none':
      default:
        return {
          animate: {},
        };
    }
  };

  // Get animation variants
  const animationVariants = getAnimationVariants(animation);
  const hoverAnimationVariants = getAnimationVariants(hoverAnimation);

  // Handle hover events
  const handleHoverStart = () => {
    setIsHovered(true);
    if (tooltip) {
      const tooltipDelay = setTimeout(() => {
        setShowTooltip(true);
      }, 500);
      return () => clearTimeout(tooltipDelay);
    }
    if (onHoverStart) onHoverStart();
  };

  const handleHoverEnd = () => {
    setIsHovered(false);
    setShowTooltip(false);
    if (onHoverEnd) onHoverEnd();
  };

  // Tooltip position classes
  const tooltipPositionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center',
        containerClassName
      )}
      onMouseEnter={handleHoverStart}
      onMouseLeave={handleHoverEnd}
    >
      <motion.div
        className={cn(
          'inline-flex items-center justify-center transition-colors',
          sizeClasses[size],
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          className
        )}
        style={{
          color: isHovered && hoverColor ? hoverColor : color,
        }}
        animate={
          isHovered ? hoverAnimationVariants.animate : animationVariants.animate
        }
        onClick={disabled ? undefined : onClick}
        onAnimationComplete={onAnimationComplete}
        {...motionProps}
      >
        {icon}
      </motion.div>

      {tooltip && showTooltip && (
        <motion.div
          className={cn(
            'absolute z-50 px-2 py-1 text-xs font-medium bg-popover text-popover-foreground rounded shadow-sm border border-border whitespace-nowrap',
            tooltipPositionClasses[tooltipPosition],
            tooltipClassName
          )}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
        >
          {tooltip}
        </motion.div>
      )}
    </div>
  );
}
