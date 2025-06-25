'use client';

import { useEffect, useState } from 'react';
import {
  DashboardLayout,
  DashboardGrid,
  StatsCard,
} from '@/components/ui/dashboard-layout';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { DataTable } from '@/components/ui/data-table';
import {
  StatusIndicator,
  StatusTimeline,
} from '@/components/ui/status-indicator';
import {
  Plus,
  Server,
  Cpu,
  Database,
  Activity,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { clusterApi } from '@/services/api';
import { DirectDeleteButton } from '@/components/direct-delete-button';

export default function DashboardPage() {
  const [clusters, setClusters] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchClusters();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      console.log('Auto-refreshing clusters...');
      fetchClusters();
    }, 30000);

    // Listen for cluster creation events
    const handleClusterCreated = () => {
      console.log('Cluster creation detected, refreshing dashboard...');
      fetchClusters();
    };

    window.addEventListener('cluster-created', handleClusterCreated);

    // Clean up interval and event listener on component unmount
    return () => {
      clearInterval(interval);
      window.removeEventListener('cluster-created', handleClusterCreated);
    };
  }, []);

  const fetchClusters = async () => {
    try {
      setRefreshing(true);
      console.log('Fetching clusters for dashboard...');

      // First try to get data from the cluster status endpoint
      const clusterStatus = await clusterApi.getClusterStatus();
      console.log('Cluster status response:', clusterStatus);

      if (clusterStatus.clusters && clusterStatus.clusters.length > 0) {
        // Add environment field to each cluster (backend might not provide this)
        const clustersWithEnvironment = clusterStatus.clusters.map(cluster => ({
          ...cluster,
          environment: cluster.environment || 'production',
          // Ensure created_at field exists for the data table
          created_at: cluster.created,
        }));

        console.log(
          'Using clusters from cluster status:',
          clustersWithEnvironment
        );
        setClusters(clustersWithEnvironment);
      } else {
        // Fallback to listClusters method
        console.log('No clusters found in status, trying listClusters...');
        const response = await clusterApi.listClusters();

        if (response && response.length > 0) {
          // Add environment field to each cluster (backend might not provide this)
          const clustersWithEnvironment = response.map(cluster => ({
            ...cluster,
            environment: cluster.environment || 'production',
            // Ensure created_at field exists for the data table
            created_at: cluster.created,
          }));

          console.log(
            'Using clusters from listClusters:',
            clustersWithEnvironment
          );
          setClusters(clustersWithEnvironment);
        } else {
          console.log('No clusters found from API');
          setClusters([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch clusters:', error);
      setClusters([]);
    } finally {
      setRefreshing(false);
    }
  };

  const clusterColumns = [
    {
      key: 'name',
      header: 'Cluster Name',
      sortable: true,
      searchable: true,
      cell: (cluster: any) => <div className='font-medium'>{cluster.name}</div>,
    },
    {
      key: 'environment',
      header: 'Environment',
      sortable: true,
      searchable: true,
      cell: (cluster: any) => (
        <div className='capitalize'>{cluster.environment}</div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (cluster: any) => (
        <StatusIndicator
          status={
            cluster.status === 'running'
              ? 'success'
              : cluster.status === 'pending'
                ? 'pending'
                : 'inactive'
          }
          text={cluster.status}
        />
      ),
    },
    {
      key: 'nodes',
      header: 'Nodes',
      sortable: true,
      cell: (cluster: any) => cluster.nodes,
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      cell: (cluster: any) => {
        const date = new Date(cluster.created_at);
        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }).format(date);
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (cluster: any) => (
        <div className='flex space-x-2'>
          <EnhancedButton size='sm' variant='outline'>
            Manage
          </EnhancedButton>
          <DirectDeleteButton
            clusterName={cluster.name}
            onSuccess={fetchClusters}
            showText={true}
          />
        </div>
      ),
    },
  ];

  const recentActivities = [
    {
      label: 'Cluster dev-cluster created',
      status: 'success' as const,
      timestamp: '2 hours ago',
      description: 'Successfully created with 3 nodes',
    },
    {
      label: 'Deployed Nginx to dev-cluster',
      status: 'success' as const,
      timestamp: '1 hour ago',
      description: 'Deployed using kubectl strategy',
    },
    {
      label: 'Scaling staging-cluster',
      status: 'pending' as const,
      timestamp: 'Just now',
      description: 'Adding 2 additional worker nodes',
    },
  ];

  return (
    <DashboardLayout
      title='Dashboard'
      description='Overview of your Kubernetes clusters and recent activities'
      actions={
        <div className='flex gap-3'>
          <EnhancedButton
            variant='outline'
            icon={<RefreshCw className='w-4 h-4' />}
            onClick={fetchClusters}
            loading={refreshing}
          >
            Refresh
          </EnhancedButton>
          <EnhancedButton
            icon={<Plus className='w-4 h-4' />}
            onClick={() => (window.location.href = '/create-cluster')}
          >
            Create Cluster
          </EnhancedButton>
        </div>
      }
    >
      {/* Increased gap between cards for better visibility */}
      <DashboardGrid columns={4}>
        <StatsCard
          title='Total Clusters'
          value={clusters.length}
          description='Active Kubernetes clusters'
          icon={<Server className='w-7 h-7' />}
          className='dashboard-card dashboard-card-primary'
        />
        <StatsCard
          title='Total Nodes'
          value={clusters.reduce((acc, cluster) => acc + cluster.nodes, 0)}
          description='Worker and control plane nodes'
          icon={<Cpu className='w-7 h-7' />}
          className='dashboard-card dashboard-card-secondary'
        />
        <StatsCard
          title='Applications'
          value='12'
          description='Deployed applications'
          icon={<Database className='w-7 h-7' />}
          trend={{ value: 20, label: 'increase this month', positive: true }}
          className='dashboard-card dashboard-card-tertiary'
        />
        <StatsCard
          title='Uptime'
          value='99.9%'
          description='Average cluster uptime'
          icon={<Activity className='w-7 h-7' />}
          className='dashboard-card dashboard-card-success'
        />
      </DashboardGrid>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8'>
        <div className='lg:col-span-2'>
          <EnhancedCard title='Clusters' className='h-full'>
            <DataTable
              data={clusters}
              columns={clusterColumns}
              emptyState={
                <div className='py-8 flex flex-col items-center'>
                  <Server className='w-12 h-12 text-muted-foreground mb-4' />
                  <h3 className='text-lg font-medium mb-2'>
                    No clusters found
                  </h3>
                  <p className='text-muted-foreground mb-4'>
                    Create your first Kubernetes cluster to get started
                  </p>
                  <EnhancedButton
                    icon={<Plus className='w-4 h-4' />}
                    onClick={() => (window.location.href = '/create-cluster')}
                  >
                    Create Cluster
                  </EnhancedButton>
                </div>
              }
            />
          </EnhancedCard>
        </div>

        <div>
          <EnhancedCard
            title='Recent Activity'
            icon={<Clock className='w-5 h-5' />}
            className='h-full'
          >
            <StatusTimeline steps={recentActivities} />
            <div className='mt-4 pt-4 border-t border-border text-center'>
              <EnhancedButton variant='link' size='sm'>
                View all activity
              </EnhancedButton>
            </div>
          </EnhancedCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
