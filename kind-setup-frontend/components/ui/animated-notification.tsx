import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  Bell,
} from 'lucide-react';
import { EnhancedButton } from './enhanced-button';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface AnimatedNotificationProps {
  type?: NotificationType;
  title?: string;
  message: string;
  isOpen?: boolean;
  onClose?: () => void;
  duration?: number;
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'bottom-center';
  showIcon?: boolean;
  showCloseButton?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  zIndex?: number;
}

export function AnimatedNotification({
  type = 'info',
  title,
  message,
  isOpen = false,
  onClose,
  duration = 5000,
  position = 'top-right',
  showIcon = true,
  showCloseButton = true,
  action,
  className = '',
  zIndex = 50,
}: AnimatedNotificationProps) {
  const [isVisible, setIsVisible] = useState(isOpen);
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  // Update visibility when isOpen prop changes
  useEffect(() => {
    setIsVisible(isOpen);
    if (isOpen) {
      setProgress(100);
    }
  }, [isOpen]);

  // Handle auto-close timer
  useEffect(() => {
    if (!isVisible || isPaused || !duration) return;

    const startTime = Date.now();
    const endTime = startTime + duration;

    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = endTime - now;
      const calculatedProgress = (remaining / duration) * 100;

      if (calculatedProgress <= 0) {
        clearInterval(timer);
        setIsVisible(false);
        if (onClose) onClose();
      } else {
        setProgress(calculatedProgress);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [isVisible, duration, isPaused, onClose]);

  // Get icon based on notification type
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className='h-5 w-5 text-success' />;
      case 'error':
        return <AlertCircle className='h-5 w-5 text-error' />;
      case 'warning':
        return <AlertTriangle className='h-5 w-5 text-warning' />;
      case 'info':
      default:
        return <Info className='h-5 w-5 text-info' />;
    }
  };

  // Get background color based on notification type
  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-success/10 border-success/30';
      case 'error':
        return 'bg-error/10 border-error/30';
      case 'warning':
        return 'bg-warning/10 border-warning/30';
      case 'info':
      default:
        return 'bg-info/10 border-info/30';
    }
  };

  // Get position classes
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 -translate-x-1/2';
      case 'bottom-center':
        return 'bottom-4 left-1/2 -translate-x-1/2';
      case 'top-right':
      default:
        return 'top-4 right-4';
    }
  };

  // Animation variants based on position
  const getAnimationVariants = () => {
    switch (position) {
      case 'top-left':
        return {
          hidden: { opacity: 0, x: -20, y: 0 },
          visible: { opacity: 1, x: 0, y: 0 },
          exit: { opacity: 0, x: -20, y: 0 },
        };
      case 'bottom-right':
        return {
          hidden: { opacity: 0, x: 20, y: 20 },
          visible: { opacity: 1, x: 0, y: 0 },
          exit: { opacity: 0, x: 20, y: 20 },
        };
      case 'bottom-left':
        return {
          hidden: { opacity: 0, x: -20, y: 20 },
          visible: { opacity: 1, x: 0, y: 0 },
          exit: { opacity: 0, x: -20, y: 20 },
        };
      case 'top-center':
        return {
          hidden: { opacity: 0, y: -20, x: 0 },
          visible: { opacity: 1, y: 0, x: 0 },
          exit: { opacity: 0, y: -20, x: 0 },
        };
      case 'bottom-center':
        return {
          hidden: { opacity: 0, y: 20, x: 0 },
          visible: { opacity: 1, y: 0, x: 0 },
          exit: { opacity: 0, y: 20, x: 0 },
        };
      case 'top-right':
      default:
        return {
          hidden: { opacity: 0, x: 20, y: 0 },
          visible: { opacity: 1, x: 0, y: 0 },
          exit: { opacity: 0, x: 20, y: 0 },
        };
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`fixed ${getPositionClasses()} max-w-md w-full pointer-events-auto ${className}`}
          style={{ zIndex }}
          initial='hidden'
          animate='visible'
          exit='exit'
          variants={getAnimationVariants()}
          transition={{ duration: 0.2 }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            className={`rounded-lg shadow-elevated border ${getBackgroundColor()} p-4 relative overflow-hidden`}
          >
            {/* Progress bar */}
            {duration > 0 && (
              <motion.div
                className={`absolute bottom-0 left-0 h-1 ${
                  type === 'success'
                    ? 'bg-success'
                    : type === 'error'
                      ? 'bg-error'
                      : type === 'warning'
                        ? 'bg-warning'
                        : 'bg-info'
                }`}
                initial={{ width: '100%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1, ease: 'linear' }}
              />
            )}

            <div className='flex'>
              {/* Icon */}
              {showIcon && (
                <div className='flex-shrink-0 mr-3'>{getIcon()}</div>
              )}

              {/* Content */}
              <div className='flex-1'>
                {title && <h4 className='text-sm font-medium mb-1'>{title}</h4>}
                <p className='text-sm text-muted-foreground'>{message}</p>

                {/* Action button */}
                {action && (
                  <div className='mt-3'>
                    <EnhancedButton
                      variant={
                        type === 'success'
                          ? 'default'
                          : type === 'error'
                            ? 'destructive'
                            : type === 'warning'
                              ? 'secondary'
                              : 'default'
                      }
                      size='sm'
                      onClick={action.onClick}
                    >
                      {action.label}
                    </EnhancedButton>
                  </div>
                )}
              </div>

              {/* Close button */}
              {showCloseButton && (
                <button
                  className='ml-4 flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors'
                  onClick={handleClose}
                  aria-label='Close notification'
                >
                  <X className='h-4 w-4' />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
