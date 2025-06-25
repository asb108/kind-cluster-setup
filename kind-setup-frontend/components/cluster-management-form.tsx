'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProgressBar } from '@/components/ui/progress-bar';
import { clusterApi } from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';

export default function ClusterManagementForm() {
  const queryClient = useQueryClient();
  const [environment, setEnvironment] = useState('');
  const [workerNodes, setWorkerNodes] = useState('');
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);

  const handleCreateCluster = async (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setProgress(0);

    try {
      if (!environment) throw new Error('Please select an environment');
      if (
        !workerNodes ||
        parseInt(workerNodes) < 1 ||
        parseInt(workerNodes) > 10
      ) {
        throw new Error('Please enter a valid number of worker nodes (1-10)');
      }

      const progressInterval = setInterval(() => {
        setProgress(prev => (prev < 90 ? prev + 10 : prev));
      }, 500);

      await clusterApi.createCluster(
        `kind-cluster-${environment}`,
        environment,
        parseInt(workerNodes)
      );

      clearInterval(progressInterval);
      setProgress(100);

      // Invalidate and refetch cluster status after successful creation
      queryClient.invalidateQueries({ queryKey: ['clusterStatus'] });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred while creating the cluster'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeployApplication = async () => {
    setError(null);
    setIsLoading(true);
    setProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => (prev < 90 ? prev + 10 : prev));
      }, 500);

      await clusterApi.deployApplication('kind-cluster-dev', 'default-app');

      clearInterval(progressInterval);
      setProgress(100);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred while deploying the application'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    setError(null);
    try {
      const status = await clusterApi.getClusterStatus();
      setStatus(status);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred while checking cluster status'
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className='bg-card text-card-foreground rounded-lg shadow-lg p-6'
    >
      {error && (
        <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4'>
          {error}
        </div>
      )}
      {status && (
        <div className='bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4'>
          <pre>{JSON.stringify(status, null, 2)}</pre>
        </div>
      )}
      <div className='flex space-x-4 mb-6'>
        <Button
          variant='secondary'
          onClick={handleCreateCluster}
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : 'Create Cluster'}
        </Button>
        <Button
          variant='ghost'
          onClick={handleDeployApplication}
          disabled={isLoading}
        >
          {isLoading ? 'Deploying...' : 'Deploy Application'}
        </Button>
        <Button
          variant='ghost'
          onClick={handleCheckStatus}
          disabled={isLoading}
        >
          Check Status
        </Button>
      </div>
      <h2 className='text-2xl font-semibold mb-4'>Create a New Cluster</h2>
      <p className='text-muted-foreground mb-6'>
        Set up a new Kind cluster for your environment
      </p>
      <form className='space-y-6'>
        <div>
          <label
            htmlFor='environment'
            className='block text-sm font-medium mb-2'
          >
            Environment
          </label>
          <Select onValueChange={setEnvironment}>
            <SelectTrigger id='environment'>
              <SelectValue placeholder='Choose the environment for your cluster' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='dev'>Development</SelectItem>
              <SelectItem value='qa'>QA</SelectItem>
              <SelectItem value='staging'>Staging</SelectItem>
              <SelectItem value='prod'>Production</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label
            htmlFor='worker-nodes'
            className='block text-sm font-medium mb-2'
          >
            Worker Nodes
          </label>
          <Input
            id='worker-nodes'
            placeholder='Specify the number of worker nodes (1-10)'
            value={workerNodes}
            onChange={e => setWorkerNodes(e.target.value)}
            type='number'
            min='1'
            max='10'
          />
        </div>
      </form>
      {isLoading && <ProgressBar progress={progress} />}
    </motion.div>
  );
}
