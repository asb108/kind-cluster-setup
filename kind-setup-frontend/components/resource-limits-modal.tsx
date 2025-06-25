'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Settings, Cpu, HardDrive } from 'lucide-react';
import { clusterApi } from '@/services/clean-api';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { motion } from 'framer-motion';

interface ResourceLimitsModalProps {
  clusterName: string;
}

export function ResourceLimitsModal({ clusterName }: ResourceLimitsModalProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cpuWorker, setCpuWorker] = useState(2);
  const [memoryWorker, setMemoryWorker] = useState('4');
  const [cpuControlPlane, setCpuControlPlane] = useState(2);
  const [memoryControlPlane, setMemoryControlPlane] = useState('4');

  // Load current resource limits when the modal opens
  const loadCurrentLimits = async () => {
    try {
      setIsLoading(true);
      console.log(
        `Loading current resource limits for cluster ${clusterName}...`
      );

      // Get the current configuration from the API
      const config = await clusterApi.getKindConfig(clusterName);
      console.log('Current cluster config:', config);

      // Extract resource limits if available
      if (config && config.resource_limits) {
        const { worker, control_plane } = config.resource_limits;

        // Update worker node settings
        if (worker) {
          setCpuWorker(parseInt(worker.cpu) || 2);
          setMemoryWorker((worker.memory || '4Gi').replace('Gi', ''));
        }

        // Update control plane settings
        if (control_plane) {
          setCpuControlPlane(parseInt(control_plane.cpu) || 2);
          setMemoryControlPlane(
            (control_plane.memory || '4Gi').replace('Gi', '')
          );
        }

        console.log(`Loaded resource limits for ${clusterName}`);
      }
    } catch (error) {
      console.error(
        `Failed to load resource limits for ${clusterName}:`,
        error
      );
      toast({
        title: 'Warning',
        description:
          'Could not load current resource limits. Using default values.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyLimits = async () => {
    setIsLoading(true);

    try {
      toast({
        title: 'Applying resource limits...',
        description: `Updating ${clusterName} with specified resource limits`,
      });

      // Format memory values to include GB
      const workerMemoryGB = `${memoryWorker}GB`;
      const controlPlaneMemoryGB = `${memoryControlPlane}GB`;

      const result = await clusterApi.setResourceLimits(
        clusterName,
        cpuWorker,
        workerMemoryGB,
        cpuControlPlane,
        controlPlaneMemoryGB
      );

      toast({
        title: 'Resource limits applied',
        description: `Successfully updated ${clusterName} resource limits`,
        variant: 'default',
      });

      // Close the dialog
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to apply resource limits:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to apply resource limits',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load current limits when the modal opens
  useEffect(() => {
    if (isOpen) {
      loadCurrentLimits();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <EnhancedButton
          variant='outline'
          size='sm'
          icon={<Settings className='h-4 w-4' />}
          data-cluster={clusterName}
        >
          Resource Limits
        </EnhancedButton>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[550px] bg-card border-border'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-h3'>
            <Settings className='h-5 w-5 text-primary' />
            Resource Limits: {clusterName}
          </DialogTitle>
          <DialogDescription>
            Configure CPU and memory limits for worker nodes and control plane
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-6 py-4'>
          <motion.div
            className='space-y-4 p-4 rounded-lg border border-border bg-muted/20'
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className='flex items-center gap-2'>
              <div className='p-2 rounded-md bg-primary/10'>
                <Cpu className='h-5 w-5 text-primary' />
              </div>
              <h3 className='font-semibold text-lg'>
                Worker Node Configuration
              </h3>
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='worker-cpu' className='flex items-center gap-1'>
                  <Cpu className='h-4 w-4 text-muted-foreground' />
                  CPU Cores
                </Label>
                <Input
                  id='worker-cpu'
                  type='number'
                  min='1'
                  max='16'
                  value={cpuWorker}
                  onChange={e => setCpuWorker(parseInt(e.target.value) || 1)}
                  disabled={isLoading}
                  className='form-input'
                />
                <p className='text-xs text-muted-foreground'>
                  Recommended: 2-4 cores per worker
                </p>
              </div>
              <div className='space-y-2'>
                <Label
                  htmlFor='worker-memory'
                  className='flex items-center gap-1'
                >
                  <HardDrive className='h-4 w-4 text-muted-foreground' />
                  Memory (GB)
                </Label>
                <Input
                  id='worker-memory'
                  type='number'
                  min='1'
                  max='64'
                  value={memoryWorker}
                  onChange={e => setMemoryWorker(e.target.value)}
                  disabled={isLoading}
                  className='form-input'
                />
                <p className='text-xs text-muted-foreground'>
                  Recommended: 4-8 GB per worker
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className='space-y-4 p-4 rounded-lg border border-border bg-muted/20'
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className='flex items-center gap-2'>
              <div className='p-2 rounded-md bg-secondary/10'>
                <Cpu className='h-5 w-5 text-secondary' />
              </div>
              <h3 className='font-semibold text-lg'>
                Control Plane Configuration
              </h3>
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label
                  htmlFor='control-plane-cpu'
                  className='flex items-center gap-1'
                >
                  <Cpu className='h-4 w-4 text-muted-foreground' />
                  CPU Cores
                </Label>
                <Input
                  id='control-plane-cpu'
                  type='number'
                  min='1'
                  max='16'
                  value={cpuControlPlane}
                  onChange={e =>
                    setCpuControlPlane(parseInt(e.target.value) || 1)
                  }
                  disabled={isLoading}
                  className='form-input'
                />
                <p className='text-xs text-muted-foreground'>
                  Recommended: 2 cores minimum
                </p>
              </div>
              <div className='space-y-2'>
                <Label
                  htmlFor='control-plane-memory'
                  className='flex items-center gap-1'
                >
                  <HardDrive className='h-4 w-4 text-muted-foreground' />
                  Memory (GB)
                </Label>
                <Input
                  id='control-plane-memory'
                  type='number'
                  min='1'
                  max='64'
                  value={memoryControlPlane}
                  onChange={e => setMemoryControlPlane(e.target.value)}
                  disabled={isLoading}
                  className='form-input'
                />
                <p className='text-xs text-muted-foreground'>
                  Recommended: 4 GB minimum
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <DialogFooter>
          <EnhancedButton
            variant='outline'
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </EnhancedButton>
          <EnhancedButton
            variant='default'
            onClick={handleApplyLimits}
            disabled={isLoading}
            loading={isLoading}
          >
            Apply Limits
          </EnhancedButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
