import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type ButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';
type AnimationVariant =
  | 'bounce'
  | 'pulse'
  | 'scale'
  | 'shine'
  | 'slide'
  | 'none';

interface AnimatedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  animation?: AnimationVariant;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  className?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  href?: string;
  animationDuration?: number;
  animationDelay?: number;
  whileHover?: object;
  whileTap?: object;
}

export function AnimatedButton({
  children,
  variant = 'default',
  size = 'default',
  animation = 'scale',
  loading = false,
  icon,
  iconPosition = 'left',
  className = '',
  fullWidth = false,
  disabled = false,
  onClick,
  href,
  animationDuration = 0.3,
  animationDelay = 0,
  whileHover,
  whileTap,
  ...props
}: AnimatedButtonProps) {
  // Default animation variants
  const defaultWhileHover = {
    scale: 1.02,
    transition: { duration: 0.2 },
  };

  const defaultWhileTap = {
    scale: 0.98,
    transition: { duration: 0.1 },
  };

  // Animation variants based on the animation prop
  const getAnimationProps = () => {
    switch (animation) {
      case 'bounce':
        return {
          whileHover: whileHover || {
            y: -5,
            transition: { duration: 0.2, type: 'spring', stiffness: 400 },
          },
          whileTap: whileTap || {
            y: 0,
            scale: 0.97,
            transition: { duration: 0.1 },
          },
          initial: { y: 0 },
        };
      case 'pulse':
        return {
          whileHover: whileHover || {
            scale: [1, 1.03, 1.01],
            transition: {
              duration: 0.5,
              repeat: Infinity,
              repeatType: 'reverse',
            },
          },
          whileTap: whileTap || defaultWhileTap,
          initial: { scale: 1 },
        };
      case 'scale':
        return {
          whileHover: whileHover || defaultWhileHover,
          whileTap: whileTap || defaultWhileTap,
          initial: { scale: 1 },
        };
      case 'shine':
        return {
          whileHover: whileHover || {
            boxShadow: `0 0 8px 2px var(--shadow-primary)`,
            transition: { duration: 0.3 },
          },
          whileTap: whileTap || defaultWhileTap,
          initial: { boxShadow: '0 0 0px 0px rgba(0,0,0,0)' },
        };
      case 'slide':
        return {
          whileHover: whileHover || { x: 3, transition: { duration: 0.2 } },
          whileTap: whileTap || { x: -1, transition: { duration: 0.1 } },
          initial: { x: 0 },
        };
      case 'none':
      default:
        return {
          whileHover: whileHover || {},
          whileTap: whileTap || {},
          initial: {},
        };
    }
  };

  const animationProps = getAnimationProps();

  // Combine classes
  const buttonClasses = cn(fullWidth && 'w-full', className);

  // Render button with animation
  return (
    <motion.div
      className={cn('inline-block', fullWidth && 'w-full')}
      initial={animationProps.initial}
      whileHover={animationProps.whileHover}
      whileTap={animationProps.whileTap}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: animationDuration,
        delay: animationDelay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Button
        variant={variant}
        size={size}
        disabled={disabled || loading}
        onClick={onClick}
        className={buttonClasses}
        {...props}
      >
        {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
        {!loading && icon && iconPosition === 'left' && (
          <span className='mr-2'>{icon}</span>
        )}
        {children}
        {!loading && icon && iconPosition === 'right' && (
          <span className='ml-2'>{icon}</span>
        )}
      </Button>
    </motion.div>
  );
}
