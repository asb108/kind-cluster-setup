import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface ProgressIndicatorProps {
  steps: {
    id: string;
    label: string;
    status: 'pending' | 'in-progress' | 'completed' | 'error';
    description?: string;
  }[];
  currentStep: string;
  orientation?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  showIcons?: boolean;
  className?: string;
}

export function ProgressIndicator({
  steps,
  currentStep,
  orientation = 'horizontal',
  showLabels = true,
  showIcons = true,
  className = '',
}: ProgressIndicatorProps) {
  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  // Status icon components
  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className='h-6 w-6 text-success' />;
      case 'error':
        return <AlertCircle className='h-6 w-6 text-error' />;
      case 'in-progress':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Clock className='h-6 w-6 text-primary' />
          </motion.div>
        );
      default:
        return (
          <div className='h-6 w-6 rounded-full border-2 border-muted-foreground' />
        );
    }
  };

  // Get status classes
  const getStatusClasses = (status: string, index: number) => {
    const baseClasses = 'transition-all duration-300';

    switch (status) {
      case 'completed':
        return `${baseClasses} bg-success`;
      case 'error':
        return `${baseClasses} bg-error`;
      case 'in-progress':
        return `${baseClasses} bg-primary animate-pulse-subtle`;
      default:
        return `${baseClasses} ${index <= currentStepIndex ? 'bg-muted-foreground' : 'bg-muted'}`;
    }
  };

  if (orientation === 'horizontal') {
    return (
      <div className={`w-full ${className}`}>
        <div className='flex items-center justify-between'>
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              {/* Step indicator */}
              <div className='flex flex-col items-center'>
                {showIcons ? (
                  <div className='relative flex items-center justify-center w-10 h-10 rounded-full bg-muted'>
                    <StatusIcon status={step.status} />
                    {step.status === 'in-progress' && (
                      <motion.div
                        className='absolute inset-0 rounded-full border-2 border-primary'
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </div>
                ) : (
                  <div
                    className={`w-4 h-4 rounded-full ${getStatusClasses(step.status, index)}`}
                  />
                )}

                {showLabels && (
                  <div className='mt-2 text-center'>
                    <p
                      className={`text-sm font-medium ${step.status === 'in-progress' ? 'text-primary' : ''}`}
                    >
                      {step.label}
                    </p>
                    {step.description && (
                      <p className='text-xs text-muted-foreground mt-1 max-w-[120px] text-center'>
                        {step.description}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className='flex-1 mx-2'>
                  <div className='h-1 relative'>
                    <div className='absolute inset-0 bg-muted rounded-full'></div>
                    <motion.div
                      className='absolute inset-0 bg-primary-gradient rounded-full origin-left'
                      initial={{ scaleX: 0 }}
                      animate={{
                        scaleX:
                          index < currentStepIndex
                            ? 1
                            : index === currentStepIndex
                              ? 0.5
                              : 0,
                      }}
                      transition={{ duration: 0.5, ease: 'easeInOut' }}
                    ></motion.div>
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  // Vertical orientation
  return (
    <div className={`w-full ${className}`}>
      <div className='flex flex-col'>
        {steps.map((step, index) => (
          <div key={step.id} className='flex items-start mb-8 last:mb-0'>
            {/* Step indicator and connector line */}
            <div className='flex flex-col items-center mr-4'>
              {showIcons ? (
                <div className='relative flex items-center justify-center w-10 h-10 rounded-full bg-muted z-10'>
                  <StatusIcon status={step.status} />
                  {step.status === 'in-progress' && (
                    <motion.div
                      className='absolute inset-0 rounded-full border-2 border-primary'
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </div>
              ) : (
                <div
                  className={`w-4 h-4 rounded-full z-10 ${getStatusClasses(step.status, index)}`}
                />
              )}

              {index < steps.length - 1 && (
                <div className='w-1 flex-1 my-2 relative h-full min-h-[40px]'>
                  <div className='absolute inset-0 bg-muted rounded-full'></div>
                  <motion.div
                    className='absolute inset-0 bg-primary-gradient rounded-full origin-top'
                    initial={{ scaleY: 0 }}
                    animate={{
                      scaleY:
                        index < currentStepIndex
                          ? 1
                          : index === currentStepIndex
                            ? 0.5
                            : 0,
                    }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                  ></motion.div>
                </div>
              )}
            </div>

            {/* Step content */}
            {showLabels && (
              <div className='pt-1'>
                <p
                  className={`text-sm font-medium ${step.status === 'in-progress' ? 'text-primary' : ''}`}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className='text-xs text-muted-foreground mt-1 max-w-[240px]'>
                    {step.description}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
