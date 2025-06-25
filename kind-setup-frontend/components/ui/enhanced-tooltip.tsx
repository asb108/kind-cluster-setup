import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

interface EnhancedTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
  contentClassName?: string;
  showArrow?: boolean;
  maxWidth?: string;
  interactive?: boolean;
}

export function EnhancedTooltip({
  children,
  content,
  position = 'top',
  delay = 300,
  className = '',
  contentClassName = '',
  showArrow = true,
  maxWidth = '250px',
  interactive = false,
}: EnhancedTooltipProps) {
  // Map our position to Shadcn UI side
  const mappedSide = position === 'left' ? 'left' :
                     position === 'right' ? 'right' :
                     position === 'bottom' ? 'bottom' :
                     'top';

  // Animation variants
  const tooltipVariants = {
    hidden: {
      opacity: 0,
      scale: 0.98,
      ...(position === 'top' && { y: 3 }),
      ...(position === 'bottom' && { y: -3 }),
      ...(position === 'left' && { x: 3 }),
      ...(position === 'right' && { x: -3 }),
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      x: 0,
      transition: {
        duration: 0.2,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      scale: 0.98,
      transition: {
        duration: 0.15,
        ease: 'easeOut',
      },
    },
  };

  // For interactive tooltips, we'll use our custom implementation
  if (interactive) {
    return (
      <div
        className={cn("relative inline-block", className)}
        onMouseEnter={() => {}}
        onMouseLeave={() => {}}
      >
        {children}
        <AnimatePresence>
          <motion.div
            className={cn(
              "absolute z-50",
              position === 'top' && 'bottom-full left-1/2 -translate-x-1/2 mb-2',
              position === 'bottom' && 'top-full left-1/2 -translate-x-1/2 mt-2',
              position === 'left' && 'right-full top-1/2 -translate-y-1/2 mr-2',
              position === 'right' && 'left-full top-1/2 -translate-y-1/2 ml-2'
            )}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={tooltipVariants}
          >
            <div
              className={cn(
                "bg-popover text-popover-foreground rounded-md py-2 px-3 text-sm shadow-md border border-border",
                contentClassName
              )}
              style={{ maxWidth }}
            >
              {content}
            </div>

            {showArrow && (
              <div
                className={cn(
                  "absolute w-0 h-0 border-4",
                  position === 'top' && 'top-full left-1/2 -translate-x-1/2 border-t-popover border-l-transparent border-r-transparent border-b-transparent',
                  position === 'bottom' && 'bottom-full left-1/2 -translate-x-1/2 border-b-popover border-l-transparent border-r-transparent border-t-transparent',
                  position === 'left' && 'left-full top-1/2 -translate-y-1/2 border-l-popover border-t-transparent border-b-transparent border-r-transparent',
                  position === 'right' && 'right-full top-1/2 -translate-y-1/2 border-r-popover border-t-transparent border-b-transparent border-l-transparent'
                )}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // For non-interactive tooltips, use Shadcn UI Tooltip
  return (
    <TooltipProvider delayDuration={delay}>
      <Tooltip>
        <TooltipTrigger asChild className={className}>
          {children}
        </TooltipTrigger>
        <TooltipContent
          side={mappedSide}
          className={contentClassName}
          style={{ maxWidth }}
          sideOffset={5}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
