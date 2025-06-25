'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { clusterApi } from '@/services/clean-api';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/ui/dashboard-layout';
import { checkClusterExists } from '@/services/cluster-status-checker';

// Simplified version of create cluster page that avoids complex component dependencies
export default function CreateCluster() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [clusterName, setClusterName] = useState('');
  const [environment, setEnvironment] = useState('dev');
  const [workerNodes, setWorkerNodes] = useState('3');
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isCheckingSkip, setIsCheckingSkip] = useState(false);
  const [creationPhase, setCreationPhase] = useState<
    | 'idle'
    | 'starting'
    | 'creating'
    | 'polling'
    | 'verifying'
    | 'completed'
    | 'failed'
  >('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showSkipButton, setShowSkipButton] = useState(false);

  // Advanced configuration options
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [workerCpu, setWorkerCpu] = useState('2');
  const [workerMemory, setWorkerMemory] = useState('4');
  const [controlPlaneCpu, setControlPlaneCpu] = useState('2');
  const [controlPlaneMemory, setControlPlaneMemory] = useState('4');
  const [applyResourceLimits, setApplyResourceLimits] = useState(true);

  // Initialize component state from URL parameters (for resuming task polling)
  useEffect(() => {
    const urlTaskId = searchParams?.get('taskId');
    const urlClusterName = searchParams?.get('clusterName');

    if (urlTaskId && urlClusterName) {
      console.log(
        `🔄 Resuming task polling from URL: taskId=${urlTaskId}, clusterName=${urlClusterName}`
      );

      // Set the state to resume polling
      setClusterName(urlClusterName);
      setTaskId(urlTaskId);
      setIsCreating(true);
      setCreationPhase('polling');
      setStatusMessage('Resuming cluster creation monitoring...');
      setProgress(30);

      // Show toast to indicate resuming
      toast({
        title: 'Resuming Cluster Creation',
        description: `Resuming monitoring for cluster '${urlClusterName}'...`,
        duration: 5000,
      });

      // Start polling the task
      pollTaskStatus(urlTaskId, urlClusterName);

      // Set up auto-completion timer
      setupAutoCompletion();

      // Show skip button after 10 seconds when resuming
      setTimeout(() => {
        setShowSkipButton(true);
      }, 10000);
    }
  }, [searchParams, toast]);

  // Auto-completion function to prevent UI from getting stuck
  const setupAutoCompletion = () => {
    // After 60 seconds, auto-complete regardless of backend status
    // This is a safety mechanism in case the task status polling fails
    setTimeout(() => {
      if (isCreating) {
        console.log('Auto-completion timer fired after 60 seconds');

        // Check if the cluster exists before redirecting
        checkIfClusterExists().then(exists => {
          if (exists) {
            console.log(
              'Auto-completion found that cluster exists, marking as success'
            );
            setProgress(100);
            setSuccess(true);
            setIsCreating(false);

            toast({
              title: 'Success',
              description: `Cluster '${clusterName}' was created successfully!`,
              duration: 5000,
            });
          } else {
            // Check dashboard for cluster status instead of assuming success
            toast({
              title: 'Proceeding to Dashboard',
              description:
                'Cluster creation may have completed. Redirecting to dashboard to check status...',
              duration: 5000,
            });
          }

          // Redirect to dashboard after a short delay
          setTimeout(() => router.push('/'), 2000);
        });
      }
    }, 300000); // Increased to 5 minutes to match longer cluster creation times
  };

  // Task polling function to track cluster creation progress
  const pollTaskStatus = useCallback(
    (taskId: string, targetClusterName?: string) => {
      const effectiveClusterName = targetClusterName || clusterName;
      console.log(
        `🔄 Starting task polling for task ID: ${taskId} for cluster: ${effectiveClusterName}`
      );

      clusterApi.pollTaskStatus(
        taskId,
        // onUpdate callback - called when task status changes
        status => {
          console.log('📊 Task status update:', status);

          // Update progress based on task status
          if (status.progress) {
            setProgress(status.progress);
          } else if (status.status === 'running') {
            setProgress(50); // Set to 50% when running
          } else if (status.status === 'pending') {
            setProgress(25); // Set to 25% when pending
          }

          // Update any status messages if provided
          if (status.message) {
            console.log(`Task message: ${status.message}`);
          }
        },
        // onComplete callback - called when task is finished
        status => {
          console.log('✅ Task completed:', status);
          console.log('🔍 DEBUG: Task completion details:', {
            status: status.status,
            success: status.success,
            message: status.message,
            completed: status.completed,
            fullStatus: status,
          });

          if (status.success || status.status === 'completed') {
            // Task completed successfully - verify cluster exists
            setCreationPhase('verifying');
            setStatusMessage('Verifying cluster status...');
            setProgress(95);

            // Quick verification that cluster actually exists
            checkIfClusterExists(effectiveClusterName)
              .then(exists => {
                if (exists) {
                  setCreationPhase('completed');
                  setStatusMessage('Cluster created successfully!');
                  setProgress(100);
                  setSuccess(true);
                  setIsCreating(false);

                  toast({
                    title: 'Success',
                    description: `Cluster '${clusterName}' created successfully!`,
                    duration: 5000,
                  });

                  // Dispatch cluster creation event for dashboard refresh
                  window.dispatchEvent(
                    new CustomEvent('cluster-created', {
                      detail: { clusterName },
                    })
                  );

                  // Redirect to dashboard after a short delay
                  setTimeout(() => {
                    router.push('/');
                  }, 2000);
                } else {
                  // Task says completed but cluster doesn't exist
                  setCreationPhase('failed');
                  setStatusMessage(
                    'Cluster creation completed but verification failed'
                  );
                  setIsCreating(false);
                  setError(
                    'Cluster creation completed but cluster verification failed'
                  );

                  toast({
                    title: 'Warning',
                    description:
                      'Cluster creation completed but verification failed. Check dashboard for status.',
                    variant: 'destructive',
                    duration: 5000,
                  });
                }
              })
              .catch(verifyError => {
                console.error('Verification error:', verifyError);
                // If verification fails, assume success and let user check dashboard
                setCreationPhase('completed');
                setStatusMessage('Cluster created (verification skipped)');
                setProgress(100);
                setSuccess(true);
                setIsCreating(false);

                toast({
                  title: 'Success',
                  description: `Cluster '${clusterName}' created successfully!`,
                  duration: 5000,
                });

                setTimeout(() => {
                  router.push('/');
                }, 2000);
              });
          } else {
            // Task failed - check if it's a timeout-related failure
            console.error('Task failed:', status);
            console.log(
              '🔍 DEBUG: Checking for backend timeout patterns in message:',
              status.message
            );

            // Check if the failure is due to a timeout (backend timeout, not polling timeout)
            const timeoutPatterns = [
              'Timeout waiting for cluster',
              'timeout',
              'not ready',
              'Failed to create cluster',
            ];

            const isBackendTimeout = timeoutPatterns.some(pattern =>
              status.message?.includes(pattern)
            );

            console.log('🔍 DEBUG: Backend timeout detection:', {
              message: status.message,
              patterns: timeoutPatterns,
              isBackendTimeout,
              matchedPatterns: timeoutPatterns.filter(pattern =>
                status.message?.includes(pattern)
              ),
            });

            if (isBackendTimeout) {
              console.log(
                '⏰ Backend timeout detected, checking if cluster exists despite failure...'
              );
              setCreationPhase('verifying');
              setStatusMessage(
                'Backend timeout detected, verifying cluster status...'
              );

              // Check if cluster exists despite backend timeout
              checkIfClusterExists()
                .then(exists => {
                  if (exists) {
                    console.log(
                      '✅ Cluster exists despite backend timeout, marking as success'
                    );
                    setCreationPhase('completed');
                    setStatusMessage('Cluster created successfully!');
                    setProgress(100);
                    setSuccess(true);
                    setIsCreating(false);

                    toast({
                      title: 'Success',
                      description: `Cluster '${clusterName}' was created successfully!`,
                      duration: 5000,
                    });

                    // Dispatch cluster creation event for dashboard refresh
                    window.dispatchEvent(
                      new CustomEvent('cluster-created', {
                        detail: { clusterName },
                      })
                    );

                    // Redirect to dashboard after a short delay
                    setTimeout(() => {
                      router.push('/');
                    }, 2000);
                  } else {
                    // Cluster doesn't exist, it's a genuine failure
                    setCreationPhase('failed');
                    setStatusMessage(
                      `Failed: ${status.message || 'Cluster creation failed'}`
                    );
                    setIsCreating(false);
                    setError(status.message || 'Cluster creation failed');

                    toast({
                      title: 'Error',
                      description: status.message || 'Cluster creation failed',
                      variant: 'destructive',
                      duration: 5000,
                    });
                  }
                })
                .catch(checkError => {
                  console.error(
                    'Error checking cluster existence after backend timeout:',
                    checkError
                  );
                  // If we can't check, assume failure
                  setCreationPhase('failed');
                  setStatusMessage(
                    `Failed: ${status.message || 'Cluster creation failed'}`
                  );
                  setIsCreating(false);
                  setError(status.message || 'Cluster creation failed');

                  toast({
                    title: 'Error',
                    description: status.message || 'Cluster creation failed',
                    variant: 'destructive',
                    duration: 5000,
                  });
                });
            } else {
              // Regular failure, not timeout-related
              setCreationPhase('failed');
              setStatusMessage(
                `Failed: ${status.message || 'Cluster creation failed'}`
              );
              setIsCreating(false);
              setError(status.message || 'Cluster creation failed');

              toast({
                title: 'Error',
                description: status.message || 'Cluster creation failed',
                variant: 'destructive',
                duration: 5000,
              });
            }
          }
        },
        // onError callback - called when polling encounters an error
        error => {
          console.error('❌ Task polling error:', error);
          console.log('🔍 DEBUG: Polling error details:', {
            message: error.message,
            name: error.name,
            isTaskTimeout: (error as any).isTaskTimeout,
            fullError: error,
          });

          // Handle timeout errors more gracefully - check for multiple timeout indicators
          const pollingTimeoutPatterns = [
            'timeout',
            'TASK_POLLING_TIMEOUT',
            'Task polling timeout',
          ];

          const isPollingTimeout =
            pollingTimeoutPatterns.some(pattern =>
              error.message?.includes(pattern)
            ) ||
            error.name === 'TaskPollingTimeout' ||
            (error as any).isTaskTimeout;

          console.log('🔍 DEBUG: Polling timeout detection:', {
            patterns: pollingTimeoutPatterns,
            isPollingTimeout,
            errorName: error.name,
            isTaskTimeout: (error as any).isTaskTimeout,
          });

          if (isPollingTimeout) {
            console.log(
              '⏰ Task polling timed out, checking if cluster exists...'
            );
            setCreationPhase('verifying');
            setStatusMessage(
              'Task polling timed out, verifying cluster status...'
            );

            // Check if cluster exists despite timeout
            checkIfClusterExists()
              .then(exists => {
                if (exists) {
                  console.log(
                    '✅ Cluster exists despite timeout, marking as success'
                  );
                  setCreationPhase('completed');
                  setStatusMessage('Cluster created successfully!');
                  setProgress(100);
                  setSuccess(true);
                  setIsCreating(false);

                  toast({
                    title: 'Success',
                    description: `Cluster '${clusterName}' was created successfully!`,
                    duration: 5000,
                  });

                  // Redirect to dashboard after a short delay
                  setTimeout(() => router.push('/'), 2000);
                } else {
                  setCreationPhase('failed');
                  setStatusMessage(
                    'Cluster creation timed out and cluster was not found'
                  );
                  setIsCreating(false);
                  setError('Cluster creation timed out');

                  toast({
                    title: 'Timeout',
                    description:
                      'Cluster creation timed out. Please check the dashboard or try again.',
                    variant: 'destructive',
                    duration: 5000,
                  });
                }
              })
              .catch(checkError => {
                console.error('Error checking cluster existence:', checkError);
                setCreationPhase('failed');
                setStatusMessage(
                  'Unable to verify cluster status after timeout'
                );
                setIsCreating(false);
                setError('Unable to verify cluster status');

                toast({
                  title: 'Error',
                  description:
                    'Unable to verify cluster status. Please check the dashboard.',
                  variant: 'destructive',
                  duration: 5000,
                });
              });
          } else {
            // Handle other errors normally
            setCreationPhase('failed');
            setStatusMessage(
              `Polling failed: ${error.message || 'Failed to track cluster creation progress'}`
            );
            setIsCreating(false);
            setError(
              error.message || 'Failed to track cluster creation progress'
            );

            toast({
              title: 'Error',
              description:
                error.message || 'Failed to track cluster creation progress',
              variant: 'destructive',
              duration: 5000,
            });
          }
        },
        2000, // Poll every 2 seconds
        600000, // 10 minute timeout for cluster operations
        effectiveClusterName // Pass cluster name for fallback checks
      );
    },
    [clusterName, router, toast]
  );

  const handleCreateCluster = async () => {
    // Validate basic inputs
    if (!clusterName) {
      setError('Please enter a cluster name');
      return;
    }

    if (
      !workerNodes ||
      parseInt(workerNodes) < 1 ||
      parseInt(workerNodes) > 10
    ) {
      setError('Please enter a valid number of worker nodes (1-10)');
      return;
    }

    // Validate advanced options if enabled
    if (showAdvancedOptions) {
      if (!workerCpu || parseInt(workerCpu) < 1 || parseInt(workerCpu) > 8) {
        setError(
          'Please enter a valid number of CPU cores for worker nodes (1-8)'
        );
        return;
      }

      if (
        !workerMemory ||
        parseInt(workerMemory) < 1 ||
        parseInt(workerMemory) > 16
      ) {
        setError(
          'Please enter a valid amount of memory for worker nodes (1-16 GB)'
        );
        return;
      }

      if (
        !controlPlaneCpu ||
        parseInt(controlPlaneCpu) < 1 ||
        parseInt(controlPlaneCpu) > 8
      ) {
        setError(
          'Please enter a valid number of CPU cores for control plane (1-8)'
        );
        return;
      }

      if (
        !controlPlaneMemory ||
        parseInt(controlPlaneMemory) < 1 ||
        parseInt(controlPlaneMemory) > 16
      ) {
        setError(
          'Please enter a valid amount of memory for control plane (1-16 GB)'
        );
        return;
      }
    }

    // Reset all state for new creation attempt
    setError(null);
    setSuccess(false);
    setIsCreating(true);
    setProgress(5);
    setCreationPhase('starting');
    setStatusMessage('Preparing cluster configuration...');
    setTaskId(null);
    setRetryCount(0);
    setShowSkipButton(false);

    // Set up auto-completion timer
    setupAutoCompletion();

    try {
      // Show initial toast to indicate the process has started
      toast({
        title: 'Creating Cluster',
        description: `Starting cluster creation for '${clusterName}'...`,
        duration: 5000,
      });

      // Prepare advanced configuration if enabled
      const config = showAdvancedOptions
        ? {
            worker_config: {
              cpu: parseInt(workerCpu),
              memory: `${workerMemory}GB`,
            },
            control_plane_config: {
              cpu: parseInt(controlPlaneCpu),
              memory: `${controlPlaneMemory}GB`,
            },
            apply_resource_limits: applyResourceLimits,
          }
        : undefined;

      // Phase 1: Check existing cluster
      setCreationPhase('creating');
      setStatusMessage('Checking if cluster already exists...');
      setProgress(15);

      // First check if the cluster already exists
      console.log(`Checking if cluster '${clusterName}' already exists...`);
      const exists = await checkIfClusterExists();

      if (exists) {
        console.log(
          `Cluster '${clusterName}' already exists, marking as success`
        );
        setCreationPhase('completed');
        setStatusMessage('Cluster already exists!');
        setProgress(100);
        setSuccess(true);
        setIsCreating(false);

        toast({
          title: 'Success',
          description: `Cluster '${clusterName}' already exists!`,
          duration: 5000,
        });

        // Dispatch cluster creation event for dashboard refresh
        window.dispatchEvent(
          new CustomEvent('cluster-created', {
            detail: { clusterName },
          })
        );

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/');
        }, 2000);
        return;
      }

      // Phase 2: Create cluster
      setStatusMessage('Initiating cluster creation...');
      setProgress(25);

      // Make API request to create cluster
      console.log(`Making API request to create cluster '${clusterName}'...`);
      const result = await clusterApi.createCluster(
        clusterName,
        environment,
        parseInt(workerNodes),
        1, // Default to 1 control plane node
        config
      );

      console.log('Cluster creation API result:', result);

      // Check if we got a task_id for polling
      if (result && result.task_id) {
        console.log(`✅ Got task ID: ${result.task_id}, starting task polling`);

        // Phase 3: Polling
        setTaskId(result.task_id);
        setCreationPhase('polling');
        setStatusMessage('Monitoring cluster creation progress...');
        setProgress(30);

        toast({
          title: 'Cluster Creation Started',
          description: `Creating cluster '${clusterName}'. This may take a few minutes...`,
          duration: 5000,
        });

        // Start task polling
        pollTaskStatus(result.task_id);

        // Show skip button after 30 seconds
        setTimeout(() => {
          if (isCreating) {
            setShowSkipButton(true);
          }
        }, 30000);
      } else if (result && result.success === true) {
        // Immediate success (no task polling needed)
        console.log('Cluster creation successful:', result.message);
        setCreationPhase('completed');
        setStatusMessage('Cluster created successfully!');
        setProgress(100);
        setSuccess(true);
        setIsCreating(false);

        toast({
          title: 'Success',
          description:
            result.message || `Cluster '${clusterName}' created successfully!`,
          duration: 5000,
        });

        // Dispatch cluster creation event for dashboard refresh
        window.dispatchEvent(
          new CustomEvent('cluster-created', {
            detail: { clusterName },
          })
        );

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        // No task ID and no explicit success - this is an error case
        const errorMessage =
          result?.message || 'Cluster creation failed - no task ID received';
        console.error(
          'Cluster creation failed:',
          errorMessage,
          'Full result:',
          result
        );
        setCreationPhase('failed');
        setStatusMessage(`Failed: ${errorMessage}`);
        setIsCreating(false);
        setError(errorMessage);

        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
          duration: 5000,
        });
      }
    } catch (err: any) {
      console.error('Error creating cluster:', err);
      const errorMessage = err.message || 'Failed to create cluster';
      setCreationPhase('failed');
      setStatusMessage(`Failed: ${errorMessage}`);
      setIsCreating(false);
      setError(errorMessage);

      toast({
        title: 'Error',
        description: `Failed to create cluster: ${errorMessage}`,
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  // Enhanced function to check if the cluster exists using our improved service
  const checkIfClusterExists = async (
    targetClusterName?: string
  ): Promise<boolean> => {
    const effectiveClusterName = targetClusterName || clusterName;
    if (!effectiveClusterName) {
      console.warn('No cluster name to check');
      return false;
    }

    console.log(
      `🔍 Checking if cluster '${effectiveClusterName}' exists using enhanced cluster checker...`
    );

    try {
      // Use the robust cluster checker with timeout
      const startTime = Date.now();
      console.log('🔍 DEBUG: Calling checkClusterExists function...');
      const result = await checkClusterExists(effectiveClusterName);
      const duration = Date.now() - startTime;

      console.log(
        `🔍 DEBUG: Cluster existence check completed in ${duration}ms: ${result ? 'EXISTS' : 'NOT FOUND'}`
      );
      console.log('🔍 DEBUG: checkClusterExists result:', result);
      return result;
    } catch (error) {
      console.error('Error in checkIfClusterExists:', error);

      // If the robust checker fails, try a simple fallback
      try {
        console.log('Robust checker failed, trying simple API fallback...');
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8020'}/api/cluster/status`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'Cache-Control': 'no-cache',
            },
            // Add a timeout for the fallback
            signal: AbortSignal.timeout(10000),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const clusters = data.data?.clusters || [];
          const exists = clusters.some(
            (cluster: any) => cluster.name === effectiveClusterName
          );
          console.log(
            `Simple fallback check result: ${exists ? 'EXISTS' : 'NOT FOUND'}`
          );
          return exists;
        }
      } catch (fallbackError) {
        console.error('Fallback cluster check also failed:', fallbackError);
      }

      return false;
    }
  };

  // Task polling is now handled by the pollTaskStatus callback function above

  return (
    <DashboardLayout title='Create Cluster'>
      <div className='max-w-3xl mx-auto'>
        {!isCreating ? (
          <div className='space-y-6'>
            <div className='grid gap-4'>
              <div className='flex flex-col space-y-1.5'>
                <label htmlFor='name' className='font-medium'>
                  Cluster Name
                </label>
                <input
                  id='name'
                  value={clusterName}
                  onChange={e => setClusterName(e.target.value)}
                  placeholder='my-kind-cluster'
                  className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground'
                />
              </div>

              <div className='flex flex-col space-y-1.5'>
                <label htmlFor='environment' className='font-medium'>
                  Environment
                </label>
                <select
                  id='environment'
                  value={environment}
                  onChange={e => setEnvironment(e.target.value)}
                  className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground'
                >
                  <option value='dev'>Development</option>
                  <option value='prod'>Production</option>
                </select>
              </div>

              <div className='flex flex-col space-y-1.5'>
                <label htmlFor='workers' className='font-medium'>
                  Worker Nodes
                </label>
                <input
                  id='workers'
                  type='number'
                  min='1'
                  max='10'
                  value={workerNodes}
                  onChange={e => setWorkerNodes(e.target.value)}
                  className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground'
                />
              </div>

              <div className='flex flex-col space-y-1.5'>
                <div className='flex items-center space-x-2'>
                  <input
                    type='checkbox'
                    id='showAdvancedOptions'
                    checked={showAdvancedOptions}
                    onChange={() =>
                      setShowAdvancedOptions(!showAdvancedOptions)
                    }
                    className='h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary'
                  />
                  <label htmlFor='showAdvancedOptions' className='font-medium'>
                    Show Advanced Options
                  </label>
                </div>
              </div>
            </div>

            {showAdvancedOptions && (
              <div className='mt-6 space-y-6 border-t pt-6'>
                <h3 className='text-lg font-medium'>Advanced Configuration</h3>
                <p className='text-sm text-muted-foreground mb-4'>
                  Fine-tune resource allocation and other advanced settings
                </p>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div className='flex flex-col space-y-1.5'>
                    <label htmlFor='workerCpu' className='font-medium'>
                      Worker Node CPU Cores
                    </label>
                    <input
                      id='workerCpu'
                      type='number'
                      min='1'
                      max='8'
                      value={workerCpu}
                      onChange={e => setWorkerCpu(e.target.value)}
                      className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground'
                    />
                    <p className='text-xs text-muted-foreground'>
                      Number of CPU cores per worker node
                    </p>
                  </div>

                  <div className='flex flex-col space-y-1.5'>
                    <label htmlFor='workerMemory' className='font-medium'>
                      Worker Node Memory (GB)
                    </label>
                    <input
                      id='workerMemory'
                      type='number'
                      min='1'
                      max='16'
                      value={workerMemory}
                      onChange={e => setWorkerMemory(e.target.value)}
                      className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground'
                    />
                    <p className='text-xs text-muted-foreground'>
                      Memory allocation per worker node in GB
                    </p>
                  </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div className='flex flex-col space-y-1.5'>
                    <label htmlFor='controlPlaneCpu' className='font-medium'>
                      Control Plane CPU Cores
                    </label>
                    <input
                      id='controlPlaneCpu'
                      type='number'
                      min='1'
                      max='8'
                      value={controlPlaneCpu}
                      onChange={e => setControlPlaneCpu(e.target.value)}
                      className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground'
                    />
                    <p className='text-xs text-muted-foreground'>
                      Number of CPU cores for control plane node
                    </p>
                  </div>

                  <div className='flex flex-col space-y-1.5'>
                    <label htmlFor='controlPlaneMemory' className='font-medium'>
                      Control Plane Memory (GB)
                    </label>
                    <input
                      id='controlPlaneMemory'
                      type='number'
                      min='1'
                      max='16'
                      value={controlPlaneMemory}
                      onChange={e => setControlPlaneMemory(e.target.value)}
                      className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground'
                    />
                    <p className='text-xs text-muted-foreground'>
                      Memory allocation for control plane node in GB
                    </p>
                  </div>
                </div>

                <div className='flex flex-col space-y-1.5'>
                  <div className='flex items-center space-x-2'>
                    <input
                      type='checkbox'
                      id='applyResourceLimits'
                      checked={applyResourceLimits}
                      onChange={() =>
                        setApplyResourceLimits(!applyResourceLimits)
                      }
                      className='h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary'
                    />
                    <label
                      htmlFor='applyResourceLimits'
                      className='font-medium'
                    >
                      Apply resource limits to containers
                    </label>
                  </div>
                  <p className='text-xs text-muted-foreground ml-6'>
                    Enforce CPU and memory limits on containers
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className='bg-destructive/10 p-4 rounded-md flex items-start gap-3 text-destructive border border-destructive/20'>
                <AlertCircle className='w-5 h-5 mt-0.5' />
                <div>
                  <p className='font-medium'>Error</p>
                  <p className='text-sm'>{error}</p>
                </div>
              </div>
            )}

            <div className='flex justify-end'>
              <Button
                onClick={handleCreateCluster}
                className='bg-primary text-white px-6'
              >
                Create Cluster
              </Button>
            </div>
          </div>
        ) : (
          <div className='bg-card border rounded-lg p-6 shadow-sm'>
            <div className='flex items-center gap-4 mb-6'>
              <Loader2 className='w-8 h-8 animate-spin text-primary' />
              <div>
                <h3 className='text-lg font-medium'>
                  {success ? 'Cluster Created!' : 'Creating Cluster...'}
                </h3>
                <p className='text-muted-foreground'>
                  Please wait while we set up your cluster
                </p>
              </div>
            </div>

            <div>
              <Progress value={progress} className='h-2 mb-4' />
              <div className='flex items-center justify-between text-sm'>
                <p className='text-muted-foreground'>
                  {statusMessage ||
                    (creationPhase === 'starting'
                      ? 'Preparing cluster configuration...'
                      : creationPhase === 'creating'
                        ? 'Initiating cluster creation...'
                        : creationPhase === 'polling'
                          ? 'Monitoring cluster creation progress...'
                          : creationPhase === 'verifying'
                            ? 'Verifying cluster status...'
                            : creationPhase === 'completed'
                              ? 'Cluster created successfully!'
                              : creationPhase === 'failed'
                                ? 'Cluster creation failed'
                                : progress < 30
                                  ? 'Initializing cluster...'
                                  : progress >= 30 && progress < 60
                                    ? 'Creating control plane...'
                                    : progress >= 60 && progress < 90
                                      ? 'Creating worker nodes...'
                                      : 'Finalizing setup...')}
                </p>
                <span className='text-xs text-muted-foreground'>
                  {Math.round(progress)}%
                </span>
              </div>
              {taskId && (
                <p className='text-xs text-muted-foreground mt-2'>
                  Task ID: {taskId}
                </p>
              )}
              {retryCount > 0 && (
                <p className='text-xs text-yellow-600 mt-1'>
                  Retry attempt: {retryCount}
                </p>
              )}
            </div>

            {/* Enhanced skip button with better error handling and loading states */}
            {showSkipButton && (
              <div className='mt-6 flex justify-end'>
                <Button
                  onClick={async () => {
                    console.log(
                      'User skipped waiting, checking if cluster exists'
                    );

                    // Set loading state to prevent multiple clicks and show visual feedback
                    setIsCheckingSkip(true);

                    try {
                      // Show immediate feedback
                      toast({
                        title: 'Checking cluster status...',
                        description:
                          'Verifying if cluster creation has completed',
                        duration: 3000,
                      });

                      // Check if the cluster exists with timeout
                      console.log(
                        `Checking if cluster '${clusterName}' exists for skip navigation...`
                      );
                      const exists = await Promise.race([
                        checkIfClusterExists(),
                        new Promise<boolean>((_, reject) =>
                          setTimeout(
                            () => reject(new Error('Cluster check timeout')),
                            15000
                          )
                        ),
                      ]);

                      if (exists) {
                        console.log(
                          '✅ Cluster exists, marking as success and redirecting'
                        );
                        setIsCreating(false);
                        setProgress(100);
                        setSuccess(true);

                        toast({
                          title: 'Success',
                          description: `Cluster '${clusterName}' was created successfully!`,
                          duration: 3000,
                        });

                        // Dispatch cluster creation event for dashboard refresh
                        window.dispatchEvent(
                          new CustomEvent('cluster-created', {
                            detail: { clusterName },
                          })
                        );

                        // Redirect immediately since cluster is confirmed to exist
                        router.push('/');
                        return;
                      } else {
                        console.log(
                          '❌ Cluster does not exist yet, going to dashboard anyway'
                        );
                        setIsCreating(false);

                        toast({
                          title: 'Proceeding to Dashboard',
                          description:
                            'Cluster creation may still be in progress. Check the dashboard for updates.',
                          duration: 4000,
                        });
                      }
                    } catch (error) {
                      console.error(
                        'Error checking cluster status for skip navigation:',
                        error
                      );
                      setIsCreating(false);

                      toast({
                        title: 'Proceeding to Dashboard',
                        description:
                          'Unable to verify cluster status. Redirecting to dashboard...',
                        duration: 4000,
                      });
                    } finally {
                      // Reset loading state
                      setIsCheckingSkip(false);
                    }

                    // Short delay before redirect to allow user to see the toast
                    setTimeout(() => {
                      router.push('/');
                    }, 1500);
                  }}
                  variant='outline'
                  size='sm'
                  disabled={isCheckingSkip}
                  data-skip-button
                >
                  {isCheckingSkip ? (
                    <>
                      <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                      Checking...
                    </>
                  ) : (
                    'Skip Waiting & Go to Dashboard'
                  )}
                </Button>
              </div>
            )}

            {success && (
              <div className='mt-6 bg-success/10 p-4 rounded-md flex items-start gap-3 text-success border border-success/20'>
                <CheckCircle2 className='w-5 h-5 mt-0.5' />
                <div>
                  <p className='font-medium'>Success!</p>
                  <p className='text-sm'>
                    Your cluster '{clusterName}' has been created successfully.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
