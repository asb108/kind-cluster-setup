import React, { useState, useEffect } from 'react';
import { GuidedTour } from '@/components/ui/guided-tour';
import type { TourStep } from '@/components/ui/guided-tour';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { HelpCircle } from 'lucide-react';
import { EnhancedButton } from './ui/enhanced-button';

export function DashboardTour() {
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [hasSeenTour, setHasSeenTour] = useLocalStorage(
    'dashboard-tour-completed',
    false
  );
  const [showTourButton, setShowTourButton] = useState(false);

  // Show the tour automatically for new users
  useEffect(() => {
    // Wait a bit before showing the tour to ensure the page is fully loaded
    const timer = setTimeout(() => {
      if (!hasSeenTour) {
        setIsTourOpen(true);
      } else {
        setShowTourButton(true);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [hasSeenTour]);

  const handleTourComplete = () => {
    setIsTourOpen(false);
    setHasSeenTour(true);
    setShowTourButton(true);
  };

  const tourSteps: TourStep[] = [
    {
      target: 'h1.gradient-text',
      title: 'Welcome to Kind Setup',
      content: (
        <div>
          <p>
            This dashboard gives you an overview of your Kubernetes clusters and
            applications.
          </p>
          <p className='mt-2'>
            Let's take a quick tour to help you get started!
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: 'a[href="/create-cluster"]',
      title: 'Create a Cluster',
      content: (
        <div>
          <p>Click here to create a new Kubernetes cluster.</p>
          <p className='mt-2'>
            You can customize the cluster configuration, including the number of
            nodes, CPU, and memory.
          </p>
        </div>
      ),
      placement: 'left',
    },
    {
      target: '.staggered-item:nth-child(1)',
      title: 'Cluster Statistics',
      content: (
        <div>
          <p>These cards show you important statistics about your clusters.</p>
          <p className='mt-2'>
            You can see the total number of clusters, nodes, applications, and
            CPU usage at a glance.
          </p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '.staggered-item:nth-child(5)',
      title: 'Cluster Management',
      content: (
        <div>
          <p>Here you can see all your clusters and manage them.</p>
          <p className='mt-2'>
            You can view configurations, adjust resource limits, and delete
            clusters when you're done with them.
          </p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: 'button:has(.h-4.w-4)',
      title: 'Cluster Actions',
      content: (
        <div>
          <p>These buttons let you perform actions on your clusters.</p>
          <p className='mt-2'>
            You can view configurations, adjust resource limits, and delete
            clusters.
          </p>
        </div>
      ),
      placement: 'left',
    },
    {
      target: 'nav a[href="/"]',
      title: 'Navigation',
      content: (
        <div>
          <p>
            Use the navigation menu to access different parts of the
            application.
          </p>
          <p className='mt-2'>
            You can create clusters, deploy applications, and monitor your
            Kubernetes environment.
          </p>
        </div>
      ),
      placement: 'right',
    },
  ];

  return (
    <>
      {showTourButton && (
        <div className='fixed bottom-4 right-4 z-40'>
          <EnhancedButton
            variant='default'
            size='sm'
            icon={<HelpCircle className='h-4 w-4' />}
            onClick={() => setIsTourOpen(true)}
            className='shadow-elevated'
          >
            Take Tour
          </EnhancedButton>
        </div>
      )}

      <GuidedTour
        steps={tourSteps}
        tourId='dashboard-tour'
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onComplete={handleTourComplete}
        showProgress={true}
        showSkip={true}
        disableDoNotShowAgain={false}
      />
    </>
  );
}
