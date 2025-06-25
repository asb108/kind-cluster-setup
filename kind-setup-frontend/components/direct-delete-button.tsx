'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { exec } from 'child_process';
import { promisify } from 'util';

interface DirectDeleteButtonProps {
  clusterName: string;
  onSuccess: () => void;
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
}

/**
 * Direct Delete Button component that makes a direct DELETE request to the backend
 * without using the API client - designed specifically to work around connectivity issues
 */
export function DirectDeleteButton({
  clusterName,
  onSuccess,
  variant = 'destructive',
  size = 'sm',
  showText = true,
}: DirectDeleteButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete cluster '${clusterName}'? This action cannot be undone.`
      )
    ) {
      return;
    }

    setLoading(true);

    try {
      // First try the API endpoint
      try {
        // Use fixed backend URL to avoid any CORS or configuration issues
        const url = `http://localhost:8020/api/cluster/${clusterName}`;

        console.log(`Directly calling DELETE ${url}`);
        toast({
          title: 'Deleting cluster...',
          description: `Attempting to delete ${clusterName}`,
        });

        // Make bare-bones DELETE request
        const result = await fetch(url, {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
          },
        });

        if (result.ok) {
          const data = await result.json();
          console.log('Delete successful:', data);

          toast({
            title: 'Success',
            description: `Successfully deleted ${clusterName}`,
          });

          // Call the success callback to refresh the UI
          onSuccess();
          return;
        } else {
          console.log(`Server returned ${result.status}: ${result.statusText}`);
        }
      } catch (apiError) {
        console.error('API deletion failed:', apiError);
      }

      // Try the direct delete endpoint
      try {
        const directUrl = '/api/cluster/delete-direct';
        console.log(`Calling direct delete endpoint: ${directUrl}`);

        const directResult = await fetch(directUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ cluster_name: clusterName }),
        });

        if (directResult.ok) {
          const directData = await directResult.json();
          console.log('Direct delete successful:', directData);

          toast({
            title: 'Success',
            description: `Successfully deleted ${clusterName}`,
          });

          // Call the success callback to refresh the UI
          onSuccess();
          return;
        } else {
          console.log(`Direct delete failed: ${directResult.status}`);
        }
      } catch (directError) {
        console.error('Direct deletion failed:', directError);
      }

      // Try the subprocess endpoint
      try {
        const subprocessUrl = '/api/subprocess/execute';
        console.log(`Calling subprocess endpoint: ${subprocessUrl}`);

        const subprocessResult = await fetch(subprocessUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            command: 'kind',
            args: ['delete', 'cluster', '--name', clusterName],
          }),
        });

        if (subprocessResult.ok) {
          const subprocessData = await subprocessResult.json();
          console.log('Subprocess delete successful:', subprocessData);

          toast({
            title: 'Success',
            description: `Successfully deleted ${clusterName}`,
          });

          // Call the success callback to refresh the UI
          onSuccess();
          return;
        } else {
          console.log(`Subprocess delete failed: ${subprocessResult.status}`);
          throw new Error('All deletion methods failed');
        }
      } catch (subprocessError) {
        console.error('Subprocess deletion failed:', subprocessError);
        throw subprocessError;
      }
    } catch (error) {
      console.error('Error during direct deletion:', error);
      toast({
        title: 'Error',
        description: `Failed to delete cluster: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      disabled={loading}
      onClick={handleDelete}
    >
      <Trash2 className='h-4 w-4' />
      {loading ? 'Deleting...' : showText ? 'Delete' : ''}
    </Button>
  );
}
