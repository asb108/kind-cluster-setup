'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  DashboardLayout,
  DashboardGrid,
} from '@/components/ui/dashboard-layout';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { EnhancedStatsCard } from '@/components/ui/enhanced-stats-card';
import { DataTable } from '@/components/ui/data-table';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Server,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  RefreshCw,
  Play,
  Square,
  RotateCcw,
  Trash2,
  Activity,
  Clock,
  Database,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  Settings,
  BarChart3,
  Layers,
} from 'lucide-react';
import { clusterApi } from '@/services/clean-api';
import { useToast } from '@/hooks/use-toast';
import { ClusterDetailModal } from '@/components/ClusterDetailModal';

// Enhanced interfaces for cluster data
interface ClusterNode {
  name: string;
  role: string;
  status: string;
  cpu: number;
  memory: number;
  disk: number;
  version: string;
  ready: boolean;
  age: string;
}

interface ClusterNamespace {
  name: string;
  status: string;
  podCount: number;
  serviceCount: number;
  age: string;
}

interface ClusterMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  podCount: number;
  serviceCount: number;
  nodeCount: number;
}

interface ClusterDetails {
  name: string;
  status: string;
  nodes: number;
  created: string;
  version?: string;
  environment?: string;
  metrics?: ClusterMetrics;
  nodeDetails?: ClusterNode[];
  namespaces?: ClusterNamespace[];
  lastUpdated?: string;
}

export default function ClusterStatus() {
  const [clusters, setClusters] = useState<ClusterDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<ClusterDetails | null>(
    null
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clusterToDelete, setClusterToDelete] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedClusterForDetails, setSelectedClusterForDetails] = useState<
    string | null
  >(null);
  const { toast } = useToast();

  // Fetch cluster data
  const fetchClusterData = useCallback(async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      console.log('🔍 Fetching cluster status...');
      const clusterStatus = await clusterApi.getClusterStatus();

      if (
        clusterStatus &&
        clusterStatus.clusters &&
        Array.isArray(clusterStatus.clusters)
      ) {
        // Enhance cluster data with additional details
        const enhancedClusters = await Promise.all(
          clusterStatus.clusters.map(async cluster => {
            try {
              // Simulate fetching additional cluster details
              // In a real implementation, you would call specific APIs for each cluster
              const enhancedCluster: ClusterDetails = {
                ...cluster,
                version: 'v1.28.0', // This would come from the API
                environment: cluster.name === 'as' ? 'development' : 'testing',
                metrics: {
                  cpuUsage: Math.floor(Math.random() * 80) + 10,
                  memoryUsage: Math.floor(Math.random() * 70) + 15,
                  diskUsage: Math.floor(Math.random() * 60) + 20,
                  podCount: Math.floor(Math.random() * 50) + 5,
                  serviceCount: Math.floor(Math.random() * 20) + 2,
                  nodeCount: cluster.nodes || 1,
                },
                nodeDetails: generateMockNodes(
                  cluster.nodes || 1,
                  cluster.name
                ),
                namespaces: generateMockNamespaces(),
                lastUpdated: new Date().toISOString(),
              };
              return enhancedCluster;
            } catch (error) {
              console.error(`Error enhancing cluster ${cluster.name}:`, error);
              return cluster as ClusterDetails;
            }
          })
        );

        setClusters(enhancedClusters);
        console.log(
          `✅ Successfully loaded ${enhancedClusters.length} clusters`
        );
      } else {
        console.log('⚠️ No clusters found');
        setClusters([]);
      }
    } catch (error) {
      console.error('❌ Error fetching cluster data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch cluster data',
        variant: 'destructive',
      });
      setClusters([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Generate mock node data (in real implementation, this would come from the API)
  const generateMockNodes = (
    nodeCount: number,
    clusterName: string
  ): ClusterNode[] => {
    const nodes: ClusterNode[] = [];

    // Control plane node
    nodes.push({
      name: `${clusterName}-control-plane`,
      role: 'control-plane',
      status: 'Ready',
      cpu: Math.floor(Math.random() * 60) + 20,
      memory: Math.floor(Math.random() * 70) + 30,
      disk: Math.floor(Math.random() * 50) + 25,
      version: 'v1.28.0',
      ready: true,
      age: '5d',
    });

    // Worker nodes
    for (let i = 1; i < nodeCount; i++) {
      nodes.push({
        name: `${clusterName}-worker-${i}`,
        role: 'worker',
        status: 'Ready',
        cpu: Math.floor(Math.random() * 80) + 10,
        memory: Math.floor(Math.random() * 75) + 15,
        disk: Math.floor(Math.random() * 60) + 20,
        version: 'v1.28.0',
        ready: true,
        age: '5d',
      });
    }

    return nodes;
  };

  // Generate mock namespace data
  const generateMockNamespaces = (): ClusterNamespace[] => {
    const namespaces = [
      {
        name: 'default',
        status: 'Active',
        podCount: 3,
        serviceCount: 1,
        age: '5d',
      },
      {
        name: 'kube-system',
        status: 'Active',
        podCount: 12,
        serviceCount: 8,
        age: '5d',
      },
      {
        name: 'kube-public',
        status: 'Active',
        podCount: 0,
        serviceCount: 0,
        age: '5d',
      },
      {
        name: 'kube-node-lease',
        status: 'Active',
        podCount: 0,
        serviceCount: 0,
        age: '5d',
      },
      {
        name: 'dev',
        status: 'Active',
        podCount: 8,
        serviceCount: 5,
        age: '3d',
      },
    ];
    return namespaces;
  };

  // Cluster management functions
  const handleClusterAction = async (
    clusterName: string,
    action: 'start' | 'stop' | 'restart'
  ) => {
    try {
      setActionLoading(`${action}-${clusterName}`);

      console.log(`🔄 ${action}ing cluster: ${clusterName}`);

      // In a real implementation, you would call the appropriate API endpoint
      // For now, we'll simulate the action
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: 'Success',
        description: `Cluster ${clusterName} ${action}ed successfully`,
      });

      // Refresh cluster data
      await fetchClusterData(true);
    } catch (error) {
      console.error(`❌ Error ${action}ing cluster:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${action} cluster ${clusterName}`,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteCluster = async () => {
    if (!clusterToDelete) return;

    try {
      setActionLoading(`delete-${clusterToDelete}`);

      console.log(`🗑️ Deleting cluster: ${clusterToDelete}`);

      // Call the delete API
      await clusterApi.deleteCluster(clusterToDelete);

      toast({
        title: 'Success',
        description: `Cluster ${clusterToDelete} deleted successfully`,
      });

      // Refresh cluster data
      await fetchClusterData(true);

      // Close dialog
      setDeleteDialogOpen(false);
      setClusterToDelete(null);
    } catch (error) {
      console.error('❌ Error deleting cluster:', error);
      toast({
        title: 'Error',
        description: `Failed to delete cluster ${clusterToDelete}`,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    fetchClusterData();
  }, [fetchClusterData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchClusterData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchClusterData]);

  // Calculate overall metrics
  const overallMetrics = (clusters || []).reduce(
    (acc, cluster) => {
      if (cluster.metrics) {
        acc.totalClusters += 1;
        acc.totalNodes += cluster.metrics.nodeCount;
        acc.totalPods += cluster.metrics.podCount;
        acc.totalServices += cluster.metrics.serviceCount;
        acc.avgCpuUsage += cluster.metrics.cpuUsage;
        acc.avgMemoryUsage += cluster.metrics.memoryUsage;
      }
      return acc;
    },
    {
      totalClusters: 0,
      totalNodes: 0,
      totalPods: 0,
      totalServices: 0,
      avgCpuUsage: 0,
      avgMemoryUsage: 0,
    }
  );

  if (overallMetrics.totalClusters > 0) {
    overallMetrics.avgCpuUsage = Math.round(
      overallMetrics.avgCpuUsage / overallMetrics.totalClusters
    );
    overallMetrics.avgMemoryUsage = Math.round(
      overallMetrics.avgMemoryUsage / overallMetrics.totalClusters
    );
  }

  // Define table columns for clusters
  const clusterColumns = [
    {
      key: 'name',
      header: 'Cluster Name',
      cell: (cluster: ClusterDetails) => (
        <div className='flex items-center gap-3'>
          <Server className='w-4 h-4 text-primary' />
          <div>
            <div className='font-medium'>{cluster.name}</div>
            <div className='text-sm text-muted-foreground'>
              {cluster.environment}
            </div>
          </div>
        </div>
      ),
      sortable: true,
      searchable: true,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (cluster: ClusterDetails) => (
        <StatusIndicator
          status={cluster.status === 'Running' ? 'success' : 'error'}
          text={cluster.status}
        />
      ),
      sortable: true,
    },
    {
      key: 'nodes',
      header: 'Nodes',
      cell: (cluster: ClusterDetails) => (
        <div className='flex items-center gap-2'>
          <Cpu className='w-4 h-4 text-muted-foreground' />
          <span>{cluster.nodes}</span>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'metrics',
      header: 'Resources',
      cell: (cluster: ClusterDetails) => (
        <div className='flex gap-4'>
          <div className='flex items-center gap-1'>
            <Cpu className='w-3 h-3 text-blue-500' />
            <span className='text-sm'>{cluster.metrics?.cpuUsage || 0}%</span>
          </div>
          <div className='flex items-center gap-1'>
            <MemoryStick className='w-3 h-3 text-green-500' />
            <span className='text-sm'>
              {cluster.metrics?.memoryUsage || 0}%
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'workloads',
      header: 'Workloads',
      cell: (cluster: ClusterDetails) => (
        <div className='flex gap-4'>
          <div className='flex items-center gap-1'>
            <Database className='w-3 h-3 text-purple-500' />
            <span className='text-sm'>
              {cluster.metrics?.podCount || 0} pods
            </span>
          </div>
          <div className='flex items-center gap-1'>
            <Network className='w-3 h-3 text-orange-500' />
            <span className='text-sm'>
              {cluster.metrics?.serviceCount || 0} svc
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'age',
      header: 'Age',
      cell: (cluster: ClusterDetails) => (
        <div className='flex items-center gap-2'>
          <Clock className='w-4 h-4 text-muted-foreground' />
          <span className='text-sm'>
            {new Date(cluster.created).toLocaleDateString()}
          </span>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (cluster: ClusterDetails) => (
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => {
              setSelectedClusterForDetails(cluster.name);
              setDetailModalOpen(true);
            }}
            className='h-8 w-8 p-0'
            title='View detailed cluster information'
          >
            <Eye className='w-4 h-4' />
          </Button>

          {cluster.status === 'Running' ? (
            <Button
              variant='ghost'
              size='sm'
              onClick={() => handleClusterAction(cluster.name, 'stop')}
              disabled={actionLoading === `stop-${cluster.name}`}
              className='h-8 w-8 p-0'
            >
              {actionLoading === `stop-${cluster.name}` ? (
                <Loader2 className='w-4 h-4 animate-spin' />
              ) : (
                <Square className='w-4 h-4' />
              )}
            </Button>
          ) : (
            <Button
              variant='ghost'
              size='sm'
              onClick={() => handleClusterAction(cluster.name, 'start')}
              disabled={actionLoading === `start-${cluster.name}`}
              className='h-8 w-8 p-0'
            >
              {actionLoading === `start-${cluster.name}` ? (
                <Loader2 className='w-4 h-4 animate-spin' />
              ) : (
                <Play className='w-4 h-4' />
              )}
            </Button>
          )}

          <Button
            variant='ghost'
            size='sm'
            onClick={() => handleClusterAction(cluster.name, 'restart')}
            disabled={actionLoading === `restart-${cluster.name}`}
            className='h-8 w-8 p-0'
          >
            {actionLoading === `restart-${cluster.name}` ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              <RotateCcw className='w-4 h-4' />
            )}
          </Button>

          <Button
            variant='ghost'
            size='sm'
            onClick={() => {
              setClusterToDelete(cluster.name);
              setDeleteDialogOpen(true);
            }}
            disabled={actionLoading === `delete-${cluster.name}`}
            className='h-8 w-8 p-0 text-destructive hover:text-destructive'
          >
            {actionLoading === `delete-${cluster.name}` ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              <Trash2 className='w-4 h-4' />
            )}
          </Button>
        </div>
      ),
    },
  ];

  // Define table columns for nodes
  const nodeColumns = [
    {
      key: 'name',
      header: 'Node Name',
      cell: (node: ClusterNode) => (
        <div className='flex items-center gap-2'>
          <Server className='w-4 h-4 text-primary' />
          <span className='font-medium'>{node.name}</span>
        </div>
      ),
      sortable: true,
      searchable: true,
    },
    {
      key: 'role',
      header: 'Role',
      cell: (node: ClusterNode) => (
        <Badge
          variant={node.role === 'control-plane' ? 'default' : 'secondary'}
        >
          {node.role}
        </Badge>
      ),
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (node: ClusterNode) => (
        <StatusIndicator
          status={node.ready ? 'success' : 'error'}
          text={node.status}
        />
      ),
      sortable: true,
    },
    {
      key: 'resources',
      header: 'Resource Usage',
      cell: (node: ClusterNode) => (
        <div className='flex gap-4'>
          <div className='flex items-center gap-1'>
            <Cpu className='w-3 h-3 text-blue-500' />
            <span className='text-sm'>{node.cpu}%</span>
          </div>
          <div className='flex items-center gap-1'>
            <MemoryStick className='w-3 h-3 text-green-500' />
            <span className='text-sm'>{node.memory}%</span>
          </div>
          <div className='flex items-center gap-1'>
            <HardDrive className='w-3 h-3 text-orange-500' />
            <span className='text-sm'>{node.disk}%</span>
          </div>
        </div>
      ),
    },
    {
      key: 'version',
      header: 'Version',
      cell: (node: ClusterNode) => (
        <span className='text-sm text-muted-foreground'>{node.version}</span>
      ),
      sortable: true,
    },
    {
      key: 'age',
      header: 'Age',
      cell: (node: ClusterNode) => (
        <span className='text-sm text-muted-foreground'>{node.age}</span>
      ),
      sortable: true,
    },
  ];

  // Define table columns for namespaces
  const namespaceColumns = [
    {
      key: 'name',
      header: 'Namespace',
      cell: (namespace: ClusterNamespace) => (
        <div className='flex items-center gap-2'>
          <Layers className='w-4 h-4 text-primary' />
          <span className='font-medium'>{namespace.name}</span>
        </div>
      ),
      sortable: true,
      searchable: true,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (namespace: ClusterNamespace) => (
        <StatusIndicator
          status={namespace.status === 'Active' ? 'success' : 'error'}
          text={namespace.status}
        />
      ),
      sortable: true,
    },
    {
      key: 'pods',
      header: 'Pods',
      cell: (namespace: ClusterNamespace) => (
        <div className='flex items-center gap-1'>
          <Database className='w-3 h-3 text-purple-500' />
          <span className='text-sm'>{namespace.podCount}</span>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'services',
      header: 'Services',
      cell: (namespace: ClusterNamespace) => (
        <div className='flex items-center gap-1'>
          <Network className='w-3 h-3 text-orange-500' />
          <span className='text-sm'>{namespace.serviceCount}</span>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'age',
      header: 'Age',
      cell: (namespace: ClusterNamespace) => (
        <span className='text-sm text-muted-foreground'>{namespace.age}</span>
      ),
      sortable: true,
    },
  ];

  return (
    <DashboardLayout
      title='Cluster Status'
      description='Monitor and manage your Kind Kubernetes clusters'
      actions={
        <div className='flex gap-3'>
          <EnhancedButton
            variant='outline'
            icon={<RefreshCw className='w-4 h-4' />}
            onClick={() => fetchClusterData(true)}
            loading={refreshing}
          >
            Refresh
          </EnhancedButton>
          <EnhancedButton
            icon={<Server className='w-4 h-4' />}
            onClick={() => (window.location.href = '/create-cluster')}
          >
            Create Cluster
          </EnhancedButton>
        </div>
      }
    >
      {/* Overview Stats */}
      <DashboardGrid columns={4}>
        <EnhancedStatsCard
          title='Total Clusters'
          value={overallMetrics.totalClusters}
          description='Active Kubernetes clusters'
          icon={<Server className='w-7 h-7' />}
          color='primary'
          loading={loading}
        />
        <EnhancedStatsCard
          title='Total Nodes'
          value={overallMetrics.totalNodes}
          description='Worker and control plane nodes'
          icon={<Cpu className='w-7 h-7' />}
          color='secondary'
          loading={loading}
        />
        <EnhancedStatsCard
          title='Running Pods'
          value={overallMetrics.totalPods}
          description='Active pod instances'
          icon={<Database className='w-7 h-7' />}
          color='tertiary'
          loading={loading}
        />
        <EnhancedStatsCard
          title='Services'
          value={overallMetrics.totalServices}
          description='Network services'
          icon={<Network className='w-7 h-7' />}
          color='info'
          loading={loading}
        />
      </DashboardGrid>

      {/* Resource Usage Overview */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8'>
        <EnhancedCard
          title='Average CPU Usage'
          icon={<Cpu className='w-5 h-5' />}
        >
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <span className='text-2xl font-bold'>
                {overallMetrics.avgCpuUsage}%
              </span>
              <Badge
                variant={
                  overallMetrics.avgCpuUsage > 80
                    ? 'destructive'
                    : overallMetrics.avgCpuUsage > 60
                      ? 'default'
                      : 'secondary'
                }
              >
                {overallMetrics.avgCpuUsage > 80
                  ? 'High'
                  : overallMetrics.avgCpuUsage > 60
                    ? 'Medium'
                    : 'Low'}
              </Badge>
            </div>
            <div className='w-full bg-secondary rounded-full h-2'>
              <div
                className='bg-primary h-2 rounded-full transition-all duration-300'
                style={{ width: `${overallMetrics.avgCpuUsage}%` }}
              />
            </div>
          </div>
        </EnhancedCard>

        <EnhancedCard
          title='Average Memory Usage'
          icon={<MemoryStick className='w-5 h-5' />}
        >
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <span className='text-2xl font-bold'>
                {overallMetrics.avgMemoryUsage}%
              </span>
              <Badge
                variant={
                  overallMetrics.avgMemoryUsage > 80
                    ? 'destructive'
                    : overallMetrics.avgMemoryUsage > 60
                      ? 'default'
                      : 'secondary'
                }
              >
                {overallMetrics.avgMemoryUsage > 80
                  ? 'High'
                  : overallMetrics.avgMemoryUsage > 60
                    ? 'Medium'
                    : 'Low'}
              </Badge>
            </div>
            <div className='w-full bg-secondary rounded-full h-2'>
              <div
                className='bg-green-500 h-2 rounded-full transition-all duration-300'
                style={{ width: `${overallMetrics.avgMemoryUsage}%` }}
              />
            </div>
          </div>
        </EnhancedCard>
      </div>

      {/* Clusters Table */}
      <div className='mt-8'>
        <EnhancedCard title='Clusters' icon={<Server className='w-5 h-5' />}>
          <DataTable
            data={clusters}
            columns={clusterColumns}
            emptyState={
              <div className='py-8 flex flex-col items-center'>
                <Server className='w-12 h-12 text-muted-foreground mb-4' />
                <h3 className='text-lg font-medium mb-2'>No clusters found</h3>
                <p className='text-muted-foreground mb-4'>
                  Create your first Kubernetes cluster to get started
                </p>
                <EnhancedButton
                  icon={<Server className='w-4 h-4' />}
                  onClick={() => (window.location.href = '/create-cluster')}
                >
                  Create Cluster
                </EnhancedButton>
              </div>
            }
          />
        </EnhancedCard>
      </div>

      {/* Cluster Details Modal */}
      {selectedCluster && (
        <Dialog
          open={!!selectedCluster}
          onOpenChange={() => setSelectedCluster(null)}
        >
          <DialogContent className='max-w-4xl max-h-[80vh] overflow-y-auto'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2'>
                <Server className='w-5 h-5' />
                Cluster Details: {selectedCluster.name}
              </DialogTitle>
              <DialogDescription>
                Detailed information about the {selectedCluster.name} cluster
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-6'>
              {/* Cluster Overview */}
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                <div className='space-y-2'>
                  <div className='text-sm text-muted-foreground'>Status</div>
                  <StatusIndicator
                    status={
                      selectedCluster.status === 'Running' ? 'success' : 'error'
                    }
                    text={selectedCluster.status}
                  />
                </div>
                <div className='space-y-2'>
                  <div className='text-sm text-muted-foreground'>
                    Environment
                  </div>
                  <Badge variant='outline'>{selectedCluster.environment}</Badge>
                </div>
                <div className='space-y-2'>
                  <div className='text-sm text-muted-foreground'>Version</div>
                  <span className='text-sm'>{selectedCluster.version}</span>
                </div>
                <div className='space-y-2'>
                  <div className='text-sm text-muted-foreground'>Created</div>
                  <span className='text-sm'>
                    {new Date(selectedCluster.created).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Resource Metrics */}
              {selectedCluster.metrics && (
                <div>
                  <h4 className='text-lg font-semibold mb-4 flex items-center gap-2'>
                    <BarChart3 className='w-5 h-5' />
                    Resource Usage
                  </h4>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                    <div className='space-y-2'>
                      <div className='flex items-center justify-between'>
                        <span className='text-sm text-muted-foreground'>
                          CPU Usage
                        </span>
                        <span className='text-sm font-medium'>
                          {selectedCluster.metrics.cpuUsage}%
                        </span>
                      </div>
                      <div className='w-full bg-secondary rounded-full h-2'>
                        <div
                          className='bg-blue-500 h-2 rounded-full transition-all duration-300'
                          style={{
                            width: `${selectedCluster.metrics.cpuUsage}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className='space-y-2'>
                      <div className='flex items-center justify-between'>
                        <span className='text-sm text-muted-foreground'>
                          Memory Usage
                        </span>
                        <span className='text-sm font-medium'>
                          {selectedCluster.metrics.memoryUsage}%
                        </span>
                      </div>
                      <div className='w-full bg-secondary rounded-full h-2'>
                        <div
                          className='bg-green-500 h-2 rounded-full transition-all duration-300'
                          style={{
                            width: `${selectedCluster.metrics.memoryUsage}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className='space-y-2'>
                      <div className='flex items-center justify-between'>
                        <span className='text-sm text-muted-foreground'>
                          Disk Usage
                        </span>
                        <span className='text-sm font-medium'>
                          {selectedCluster.metrics.diskUsage}%
                        </span>
                      </div>
                      <div className='w-full bg-secondary rounded-full h-2'>
                        <div
                          className='bg-orange-500 h-2 rounded-full transition-all duration-300'
                          style={{
                            width: `${selectedCluster.metrics.diskUsage}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Nodes Table */}
              {selectedCluster.nodeDetails && (
                <div>
                  <h4 className='text-lg font-semibold mb-4 flex items-center gap-2'>
                    <Cpu className='w-5 h-5' />
                    Nodes ({selectedCluster.nodeDetails.length})
                  </h4>
                  <DataTable
                    data={selectedCluster.nodeDetails}
                    columns={nodeColumns}
                    pagination={false}
                  />
                </div>
              )}

              {/* Namespaces Table */}
              {selectedCluster.namespaces && (
                <div>
                  <h4 className='text-lg font-semibold mb-4 flex items-center gap-2'>
                    <Layers className='w-5 h-5' />
                    Namespaces ({selectedCluster.namespaces.length})
                  </h4>
                  <DataTable
                    data={selectedCluster.namespaces}
                    columns={namespaceColumns}
                    pagination={false}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => setSelectedCluster(null)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <AlertTriangle className='w-5 h-5 text-destructive' />
              Delete Cluster
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the cluster "{clusterToDelete}"?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={handleDeleteCluster}
              disabled={!!actionLoading}
            >
              {actionLoading ? (
                <>
                  <Loader2 className='w-4 h-4 animate-spin mr-2' />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className='w-4 h-4 mr-2' />
                  Delete Cluster
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cluster Detail Modal */}
      <ClusterDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedClusterForDetails(null);
        }}
        clusterName={selectedClusterForDetails || ''}
      />
    </DashboardLayout>
  );
}
