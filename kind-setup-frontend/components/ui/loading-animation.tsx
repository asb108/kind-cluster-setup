import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Server, Database, Cpu } from 'lucide-react';

type LoadingVariant =
  | 'spinner'
  | 'dots'
  | 'pulse'
  | 'progress'
  | 'skeleton'
  | 'kubernetes';

interface LoadingAnimationProps {
  variant?: LoadingVariant;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
  className?: string;
  progress?: number;
  fullScreen?: boolean;
}

export function LoadingAnimation({
  variant = 'spinner',
  size = 'md',
  color = 'primary',
  text,
  className = '',
  progress = 0,
  fullScreen = false,
}: LoadingAnimationProps) {
  // Size mappings
  const sizeMap = {
    sm: {
      container: 'h-6 w-6',
      icon: 'h-4 w-4',
      text: 'text-xs',
      dot: 'h-1.5 w-1.5',
      bar: 'h-1',
    },
    md: {
      container: 'h-10 w-10',
      icon: 'h-6 w-6',
      text: 'text-sm',
      dot: 'h-2 w-2',
      bar: 'h-2',
    },
    lg: {
      container: 'h-16 w-16',
      icon: 'h-10 w-10',
      text: 'text-base',
      dot: 'h-3 w-3',
      bar: 'h-3',
    },
  };

  // Color mappings
  const colorClass = `text-${color}`;

  // Container class based on fullScreen prop
  const containerClass = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50'
    : 'flex flex-col items-center justify-center';

  // Render different loading animations based on variant
  const renderLoadingAnimation = () => {
    switch (variant) {
      case 'spinner':
        return (
          <div className={`${containerClass} ${className}`}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className={`${sizeMap[size].container} ${colorClass}`}
            >
              <Loader2 className={`${sizeMap[size].icon} animate-spin`} />
            </motion.div>
            {text && (
              <p className={`mt-3 ${sizeMap[size].text} text-muted-foreground`}>
                {text}
              </p>
            )}
          </div>
        );

      case 'dots':
        return (
          <div className={`${containerClass} ${className}`}>
            <div className='flex space-x-2'>
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className={`${sizeMap[size].dot} rounded-full bg-${color}`}
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    repeatType: 'loop',
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
            {text && (
              <p className={`mt-3 ${sizeMap[size].text} text-muted-foreground`}>
                {text}
              </p>
            )}
          </div>
        );

      case 'pulse':
        return (
          <div className={`${containerClass} ${className}`}>
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [1, 0.7, 1] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className={`${sizeMap[size].container} rounded-full bg-${color}/20 flex items-center justify-center`}
            >
              <div className={`${sizeMap[size].icon} ${colorClass}`}>
                <Loader2 className='w-full h-full' />
              </div>
            </motion.div>
            {text && (
              <p className={`mt-3 ${sizeMap[size].text} text-muted-foreground`}>
                {text}
              </p>
            )}
          </div>
        );

      case 'progress':
        return (
          <div className={`${containerClass} w-full max-w-md ${className}`}>
            <div className='w-full'>
              <div className='flex justify-between mb-2'>
                <span className={`${sizeMap[size].text} text-muted-foreground`}>
                  {text || 'Loading...'}
                </span>
                <span
                  className={`${sizeMap[size].text} ${colorClass}`}
                >{`${Math.round(progress)}%`}</span>
              </div>
              <div
                className={`w-full bg-muted rounded-full overflow-hidden ${sizeMap[size].bar}`}
              >
                <motion.div
                  className={`h-full bg-${color} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>
        );

      case 'skeleton':
        return (
          <div className={`${containerClass} w-full ${className}`}>
            <div className='w-full space-y-3'>
              <motion.div
                className='h-4 bg-muted rounded-md w-3/4'
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <motion.div
                className='h-4 bg-muted rounded-md w-full'
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.2,
                }}
              />
              <motion.div
                className='h-4 bg-muted rounded-md w-2/3'
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.4,
                }}
              />
            </div>
            {text && (
              <p className={`mt-3 ${sizeMap[size].text} text-muted-foreground`}>
                {text}
              </p>
            )}
          </div>
        );

      case 'kubernetes':
        return (
          <div className={`${containerClass} ${className}`}>
            <div className='relative'>
              <motion.div
                className={`absolute inset-0 rounded-full border-2 border-${color} border-t-transparent`}
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className='flex items-center justify-center'
                animate={{ rotate: -360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              >
                <Server className={`${sizeMap[size].icon} ${colorClass}`} />
              </motion.div>
              <motion.div
                className='absolute top-0 right-0'
                animate={{ rotate: 360 }}
                transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
              >
                <Cpu className={`${sizeMap[size].icon} text-secondary`} />
              </motion.div>
              <motion.div
                className='absolute bottom-0 left-0'
                animate={{ rotate: 360 }}
                transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
              >
                <Database className={`${sizeMap[size].icon} text-tertiary`} />
              </motion.div>
            </div>
            {text && (
              <p className={`mt-5 ${sizeMap[size].text} text-muted-foreground`}>
                {text}
              </p>
            )}
          </div>
        );

      default:
        return (
          <div className={`${containerClass} ${className}`}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className={`${sizeMap[size].container} ${colorClass}`}
            >
              <Loader2 className={`${sizeMap[size].icon}`} />
            </motion.div>
            {text && (
              <p className={`mt-3 ${sizeMap[size].text} text-muted-foreground`}>
                {text}
              </p>
            )}
          </div>
        );
    }
  };

  return renderLoadingAnimation();
}
