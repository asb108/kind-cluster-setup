'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function LightweightStatus() {
  const [clusters, setClusters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchDirectClusterStatus = async () => {
    setRefreshing(true);
    try {
      // Make a direct fetch with abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // Short 2s timeout

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8020';
      const response = await fetch(`${apiUrl}/api/cluster/status`, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Lightweight status data:', data);

      // Extract clusters with minimal processing
      let clustersList = [];
      if (data && data.data && Array.isArray(data.data.clusters)) {
        clustersList = data.data.clusters.map((cluster: any) => ({
          name: cluster.name || 'unknown',
          status: cluster.status || 'Unknown',
          nodes: cluster.nodes || 1,
        }));
      }

      setClusters(clustersList);
    } catch (error) {
      console.error('Error fetching clusters:', error);
      // Don't show error toast on initial load
      if (!loading) {
        toast({
          title: 'Error',
          description:
            'Failed to fetch clusters. The backend may be busy with cluster creation.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDirectClusterStatus();

    // Refresh every 5 seconds
    const intervalId = setInterval(fetchDirectClusterStatus, 5000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4'>
        <div>
          <h1 className='text-2xl font-bold'>Lightweight Cluster Status</h1>
          <p className='text-muted-foreground'>
            View running Kind clusters with minimal backend load
          </p>
        </div>
        <div className='flex space-x-2'>
          <Link href='/'>
            <Button variant='outline' size='sm'>
              <Home className='w-4 h-4 mr-2' /> Dashboard
            </Button>
          </Link>
          <Button
            variant='secondary'
            size='sm'
            onClick={fetchDirectClusterStatus}
            disabled={refreshing}
          >
            {refreshing ? (
              <>
                <Loader2 className='w-4 h-4 mr-2 animate-spin' /> Refreshing
              </>
            ) : (
              <>
                <RefreshCw className='w-4 h-4 mr-2' /> Refresh
              </>
            )}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className='flex justify-center items-center h-40'>
          <Loader2 className='w-6 h-6 animate-spin mr-2' />
          <span>Loading...</span>
        </div>
      ) : clusters.length === 0 ? (
        <div className='bg-muted p-6 rounded-lg text-center'>
          <p>No clusters found.</p>
        </div>
      ) : (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {clusters.map(cluster => (
            <div
              key={cluster.name}
              className='bg-card text-card-foreground border rounded-lg shadow-sm p-4'
            >
              <div className='font-medium text-lg mb-2'>{cluster.name}</div>
              <div className='grid grid-cols-2 gap-2 text-sm'>
                <div className='text-muted-foreground'>Status:</div>
                <div className='font-medium text-foreground'>
                  {cluster.status || 'Unknown'}
                </div>

                <div className='text-muted-foreground'>Nodes:</div>
                <div className='font-medium text-foreground'>
                  {cluster.nodes || 'Unknown'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className='mt-8 text-sm text-muted-foreground'>
        <p>
          This page uses a lightweight approach to check cluster status that
          minimizes backend load.
        </p>
        <p>
          Use this page during cluster creation operations when the main
          dashboard might be slow to respond.
        </p>
      </div>
    </div>
  );
}
