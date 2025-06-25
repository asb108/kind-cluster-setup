import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react';
import { EnhancedButton } from './enhanced-button';
import { useLocalStorage } from '@/hooks/use-local-storage';

export interface TourStep {
  target: string; // CSS selector for the target element
  title: string;
  content: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  spotlightRadius?: number;
  disableOverlay?: boolean;
  disableBeacon?: boolean;
  highlightPadding?: number;
}

interface GuidedTourProps {
  steps: TourStep[];
  tourId: string; // Unique identifier for this tour
  isOpen?: boolean;
  onClose?: () => void;
  onComplete?: () => void;
  showSkip?: boolean;
  showProgress?: boolean;
  showCloseButton?: boolean;
  spotlightPadding?: number;
  className?: string;
  startAt?: number;
  disableInteraction?: boolean;
  disableKeyboardNavigation?: boolean;
  disableDoNotShowAgain?: boolean;
  backdropColor?: string;
  zIndex?: number;
}

export function GuidedTour({
  steps,
  tourId,
  isOpen = false,
  onClose,
  onComplete,
  showSkip = true,
  showProgress = true,
  showCloseButton = true,
  spotlightPadding = 10,
  className = '',
  startAt = 0,
  disableInteraction = false,
  disableKeyboardNavigation = false,
  disableDoNotShowAgain = false,
  backdropColor = 'rgba(0, 0, 0, 0.5)',
  zIndex = 1000,
}: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(startAt);
  const [isVisible, setIsVisible] = useState(isOpen);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [hasCompletedTour, setHasCompletedTour] = useState(false);
  const [doNotShowAgain, setDoNotShowAgain] = useLocalStorage(`tour-${tourId}-completed`, false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calculate the position of the tooltip based on the target element and placement
  const calculatePosition = (targetElement: Element, placement: string, tooltipElement: HTMLElement | null) => {
    const rect = targetElement.getBoundingClientRect();
    const tooltipRect = tooltipElement?.getBoundingClientRect() || { width: 300, height: 200 };
    const padding = spotlightPadding;

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = rect.top - tooltipRect.height - padding;
        left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'bottom':
        top = rect.bottom + padding;
        left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'left':
        top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
        left = rect.left - tooltipRect.width - padding;
        break;
      case 'right':
        top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
        left = rect.right + padding;
        break;
      default:
        top = rect.bottom + padding;
        left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    }

    // Ensure the tooltip stays within the viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < 20) left = 20;
    if (left + tooltipRect.width > viewportWidth - 20) left = viewportWidth - tooltipRect.width - 20;
    if (top < 20) top = 20;
    if (top + tooltipRect.height > viewportHeight - 20) top = viewportHeight - tooltipRect.height - 20;

    return { top, left };
  };

  // Update the position of the tooltip when the target element changes
  useEffect(() => {
    if (!isVisible || currentStep >= steps.length) return;

    const step = steps[currentStep];
    const targetElement = document.querySelector(step.target);

    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      setTargetRect(rect);

      const position = calculatePosition(
        targetElement,
        step.placement || 'bottom',
        tooltipRef.current
      );

      setTooltipPosition(position);
    }
  }, [currentStep, isVisible, steps]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isVisible || disableKeyboardNavigation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          handleClose();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, currentStep, disableKeyboardNavigation]);

  // Update visibility when isOpen prop changes
  useEffect(() => {
    if (doNotShowAgain) {
      setIsVisible(false);
      return;
    }
    setIsVisible(isOpen);
  }, [isOpen, doNotShowAgain]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!isVisible || currentStep >= steps.length) return;

      const step = steps[currentStep];
      const targetElement = document.querySelector(step.target);

      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        setTargetRect(rect);

        const position = calculatePosition(
          targetElement,
          step.placement || 'bottom',
          tooltipRef.current
        );

        setTooltipPosition(position);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isVisible, currentStep, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  const handleComplete = () => {
    setIsVisible(false);
    setHasCompletedTour(true);
    if (onComplete) onComplete();
  };

  const handleDoNotShowAgain = () => {
    setDoNotShowAgain(true);
    handleClose();
  };

  if (!isVisible || doNotShowAgain) return null;
  if (currentStep >= steps.length) return null;

  const currentTourStep = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex }}>
      {/* Backdrop with spotlight */}
      <div
        className="absolute inset-0 pointer-events-auto"
        style={{
          backgroundColor: backdropColor,
          maskImage: targetRect ? `
            radial-gradient(
              circle at ${targetRect.left + targetRect.width / 2}px ${targetRect.top + targetRect.height / 2}px,
              transparent ${Math.max(targetRect.width, targetRect.height) / 2 + spotlightPadding}px,
              black ${Math.max(targetRect.width, targetRect.height) / 2 + spotlightPadding + 1}px
            )
          ` : 'none',
          WebkitMaskImage: targetRect ? `
            radial-gradient(
              circle at ${targetRect.left + targetRect.width / 2}px ${targetRect.top + targetRect.height / 2}px,
              transparent ${Math.max(targetRect.width, targetRect.height) / 2 + spotlightPadding}px,
              black ${Math.max(targetRect.width, targetRect.height) / 2 + spotlightPadding + 1}px
            )
          ` : 'none',
        }}
        onClick={!disableInteraction ? handleClose : undefined}
      />

      {/* Tooltip */}
      <AnimatePresence>
        <motion.div
          ref={tooltipRef}
          className={`absolute pointer-events-auto bg-card dark:bg-card-dark rounded-lg shadow-elevated border border-border p-4 max-w-md ${className}`}
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            zIndex: zIndex + 1,
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
        >
          {/* Close button */}
          {showCloseButton && (
            <button
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
              onClick={handleClose}
              aria-label="Close tour"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Title */}
          <h3 className="text-lg font-semibold mb-2">{currentTourStep.title}</h3>

          {/* Content */}
          <div className="mb-4 text-muted-foreground">
            {currentTourStep.content}
          </div>

          {/* Progress indicator */}
          {showProgress && (
            <div className="flex items-center justify-center mb-4">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 w-8 mx-0.5 rounded-full ${
                    index === currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between">
            <div>
              {!disableDoNotShowAgain && (
                <button
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={handleDoNotShowAgain}
                >
                  Don't show again
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {showSkip && !isLastStep && (
                <button
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={handleComplete}
                >
                  Skip
                </button>
              )}
              {!isFirstStep && (
                <EnhancedButton
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  icon={<ChevronLeft className="h-4 w-4" />}
                >
                  Previous
                </EnhancedButton>
              )}
              <EnhancedButton
                variant="default"
                size="sm"
                onClick={handleNext}
                icon={isLastStep ? undefined : <ChevronRight className="h-4 w-4" />}
                iconPosition={isLastStep ? 'left' : 'right'}
              >
                {isLastStep ? 'Finish' : 'Next'}
              </EnhancedButton>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
