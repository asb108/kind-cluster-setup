'use client';

import Link from 'next/link';
import {
  Plus,
  Server,
  HardDrive,
  AppWindow,
  Cpu,
  RefreshCcw,
  Trash2,
  Eye,
  Settings,
  BarChart3,
  PieChart,
  Activity,
  Database,
  Clock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { useEffect, useState } from 'react';
import { clusterApi } from '@/services/api';
import type { Cluster, ClusterStatus } from '@/services/clean-api';
import { ClusterConfigModal } from '@/components/cluster-config-modal';
import { DirectDeleteButton } from '@/components/direct-delete-button';
import { ResourceLimitsModal } from '@/components/resource-limits-modal';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { EnhancedTooltip } from '@/components/ui/enhanced-tooltip';
import {
  AnimatedCounter,
  AnimatedStatistic,
} from '@/components/ui/animated-counter';
import { AnimatedList, AnimatedListItem } from '@/components/ui/animated-list';
import { ScrollReveal, StaggeredReveal } from '@/components/ui/scroll-reveal';
import { AnimatedNotification } from '@/components/ui/animated-notification';
import { DashboardTour } from '@/components/dashboard-tour';
import { AnimatedButton } from '@/components/ui/animated-button';
import { AnimatedText } from '@/components/ui/animated-text';
import { AnimatedSection } from '@/components/ui/animated-section';
import { AnimatedProgress } from '@/components/ui/animated-progress';
import {
  DashboardLayout,
  DashboardGrid,
  StatsCard,
} from '@/components/ui/dashboard-layout';
import { DonutChart } from '@/components/ui/donut-chart';
import { BarChart } from '@/components/ui/bar-chart';
import { PageTransitionWrapper } from '@/components/ui/page-transition-wrapper';
import {
  SkeletonDashboard,
  SkeletonStatsCard,
  SkeletonTable,
} from '@/components/ui/skeleton-loader';

export default function Home() {
  const { toast } = useToast();

  // State for cluster config modal
  const [configModal, setConfigModal] = useState({
    isOpen: false,
    clusterName: '',
    config: null as any,
    isLoading: false,
  });

  // Extend the Cluster interface to ensure it has all required properties
  interface ClusterWithStatus extends Cluster {
    name: string;
    status: string;
    nodes: number;
    created: string;
  }

  interface StatsState {
    clusterCount: number;
    nodeCount: number;
    cpuUsage: number;
    memoryUsage: number;
    clusters: ClusterWithStatus[];
    refreshing: boolean;
    lastRefreshed: Date | null;
  }

  const [stats, setStats] = useState<StatsState>({
    clusterCount: 0,
    nodeCount: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    clusters: [],
    refreshing: false,
    lastRefreshed: null,
  });

  const fetchClusterStats = async () => {
    // Show immediate feedback
    setStats(prev => ({
      ...prev,
      refreshing: true,
      // Keep existing clusters to avoid flashing empty state
      // but mark them as refreshing
      clusters: prev.clusters.map(c => ({
        ...c,
        status: c.status === 'Running' ? 'Running' : 'Refreshing...',
      })),
    }));

    try {
      console.log('📊 Fetching cluster stats for dashboard...');

      // Create an AbortController to timeout long requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        try {
          controller.abort(
            new DOMException('Timeout exceeded', 'TimeoutError')
          );
        } catch (e) {
          console.warn('Error aborting controller:', e);
        }
      }, 12000); // 12 second timeout (reduced from 15s for faster feedback)

      // Make direct request with enhanced cache busting
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8020';
      const cacheBuster = Date.now();
      console.log(
        `📡 Making request to ${apiUrl}/api/cluster/status?_=${cacheBuster}`
      );

      // Use direct fetch with timeout and enhanced headers
      const response = await fetch(
        `${apiUrl}/api/cluster/status?_=${cacheBuster}`,
        {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
            Accept: 'application/json',
          },
        }
      ).catch(err => {
        console.error('❌ Fetch error:', err);
        throw new Error(`Fetch failed: ${err.message}`);
      });

      // Clear the timeout since we got a response
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`API returned status ${response.status}`);
        throw new Error(`API request failed with status ${response.status}`);
      }

      const result = await response.json().catch(err => {
        console.error('JSON parse error:', err);
        throw new Error('Failed to parse API response');
      });

      console.log('Raw API response:', JSON.stringify(result, null, 2));

      // Extract data from the nested response structure
      const clusterData = result.data || {};
      const clusters = Array.isArray(clusterData.clusters)
        ? clusterData.clusters
            .filter((cluster: any) => cluster && typeof cluster === 'object')
            .map((cluster: any) => ({
              name: cluster.name || 'unnamed-cluster',
              status: cluster.status || 'Unknown',
              nodes: Number.isInteger(cluster.nodes) ? cluster.nodes : 1,
              created: cluster.created || new Date().toISOString(),
            }))
        : [];

      const nodeCount = Number.isInteger(clusterData.node_count)
        ? clusterData.node_count
        : clusters.reduce(
            (sum: number, cluster: any) =>
              sum + (Number.isInteger(cluster.nodes) ? cluster.nodes : 1),
            0
          );

      const clusterCount = Number.isInteger(clusterData.cluster_count)
        ? clusterData.cluster_count
        : clusters.length;

      // Calculate resource usage based on cluster status
      let cpuUsage = 0;
      let memoryUsage = 0;

      // If we have CPU usage data from the API, use it
      if (Number.isInteger(clusterData.cpu_usage)) {
        cpuUsage = Math.min(Math.max(0, clusterData.cpu_usage), 100);
      } else {
        // Estimate CPU usage based on number of running clusters
        const runningClusters = clusters.filter(
          (c: ClusterWithStatus) => c.status === 'Running'
        ).length;
        cpuUsage = Math.min(runningClusters * 15, 85); // 15% per running cluster, capped at 85%
      }

      // Estimate memory usage based on number of nodes
      memoryUsage = Math.min(nodeCount * 25, 90); // 25% per node, capped at 90%

      const newStats = {
        clusterCount: clusterCount,
        nodeCount: nodeCount,
        cpuUsage: cpuUsage,
        memoryUsage: memoryUsage,
        clusters: clusters,
        refreshing: false,
        lastRefreshed: new Date(),
      };

      setStats(newStats);
      console.log('Updated stats:', newStats);
    } catch (error) {
      console.error('Error fetching cluster stats:', error);

      // Enhanced fallback with multiple endpoints
      try {
        console.log('🔄 Attempting enhanced fallback cluster data fetch...');
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8020';
        const cacheBuster = Date.now();

        // Try multiple endpoints in sequence
        const fallbackEndpoints = [
          `/api/cluster/list?_=${cacheBuster}`,
          `/api/cluster/status?_=${cacheBuster}`,
          `/api/clusters?_=${cacheBuster}`, // Alternative endpoint
        ];

        for (const endpoint of fallbackEndpoints) {
          try {
            console.log(`🔍 Trying fallback endpoint: ${endpoint}`);
            const fallbackResponse = await fetch(`${apiUrl}${endpoint}`, {
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                Pragma: 'no-cache',
                Expires: '0',
                Accept: 'application/json',
              },
              signal: AbortSignal.timeout(8000), // 8s timeout for fallback
            });

            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              console.log(
                `✅ Fallback endpoint ${endpoint} succeeded:`,
                fallbackData
              );

              let clusters = [];

              // Handle different response formats
              if (fallbackData && fallbackData.data) {
                if (Array.isArray(fallbackData.data)) {
                  // Direct list format
                  clusters = fallbackData.data;
                } else if (
                  fallbackData.data.clusters &&
                  Array.isArray(fallbackData.data.clusters)
                ) {
                  // Status format
                  clusters = fallbackData.data.clusters;
                }
              }

              if (clusters.length >= 0) {
                // Allow empty arrays
                // Format the clusters
                const formattedClusters = clusters.map((cluster: any) => ({
                  name:
                    cluster.name || cluster.cluster_name || 'unnamed-cluster',
                  status: cluster.status || 'Unknown',
                  nodes: Number.isInteger(cluster.nodes) ? cluster.nodes : 1,
                  created: cluster.created || new Date().toISOString(),
                }));

                // Update stats with the fallback data
                setStats(prev => ({
                  ...prev,
                  clusters: formattedClusters,
                  clusterCount: formattedClusters.length,
                  nodeCount: formattedClusters.reduce(
                    (sum: number, c: any) => sum + (c.nodes || 1),
                    0
                  ),
                  refreshing: false,
                  lastRefreshed: new Date(),
                }));

                console.log(
                  `✅ Successfully used fallback data from ${endpoint}`
                );
                return; // Exit early since we handled the error
              }
            }
          } catch (endpointError) {
            console.warn(
              `⚠️ Fallback endpoint ${endpoint} failed:`,
              endpointError
            );
            // Continue to next endpoint
          }
        }

        console.error('❌ All fallback endpoints failed');
      } catch (fallbackError) {
        console.error('❌ Fallback fetch system failed:', fallbackError);
      }

      // If we get here, both primary and fallback fetches failed
      setStats(prev => ({
        ...prev,
        refreshing: false,
        lastRefreshed: new Date(),
      }));

      // Only show error toast if this isn't the initial load
      if (stats.lastRefreshed) {
        toast({
          title: 'Error',
          description:
            'Failed to fetch cluster statistics. The backend service may be unavailable.',
          variant: 'destructive',
        });
      }
    }
  };

  // Manual refresh function for user-triggered updates
  const handleManualRefresh = async () => {
    console.log('🔄 Manual refresh triggered by user');

    // Show immediate feedback
    toast({
      title: 'Refreshing Dashboard',
      description: 'Updating cluster statistics...',
      duration: 2000,
    });

    try {
      await fetchClusterStats();

      toast({
        title: 'Dashboard Updated',
        description: 'Cluster statistics have been refreshed',
        duration: 2000,
      });
    } catch (error) {
      console.error('Manual refresh failed:', error);

      toast({
        title: 'Refresh Failed',
        description: 'Unable to update cluster statistics. Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  // Function to handle opening the config modal
  const openConfigModal = async (clusterName: string) => {
    console.log(`Opening config modal for cluster: ${clusterName}`);
    setConfigModal({
      isOpen: true,
      clusterName,
      config: null,
      isLoading: true,
    });

    try {
      // Get configuration directly from API
      console.log(`Fetching config for cluster: ${clusterName}`);
      const response = await clusterApi.getKindConfig(clusterName);
      console.log('Raw response from API:', JSON.stringify(response, null, 2));
      console.log('Response type:', typeof response);
      console.log(
        'Response keys:',
        response ? Object.keys(response) : 'No keys (null/undefined)'
      );

      if (response && typeof response === 'object' && 'data' in response) {
        console.log('Response.data type:', typeof response.data);
        console.log(
          'Response.data keys:',
          response.data
            ? Object.keys(response.data)
            : 'No keys (null/undefined)'
        );
      }

      // The backend API returns data in a nested structure
      // First, try to extract from response.data (standard API response format)
      // If that's not available, use the response directly (direct fetch format)
      let rawConfig;

      if (response && typeof response === 'object') {
        if (response.data && typeof response.data === 'object') {
          // Standard API response format with nested data
          rawConfig = response.data;
        } else if (response.status === 'success' && response.data) {
          // Backend API response format
          rawConfig = response.data;
        } else {
          // Direct response format
          rawConfig = response;
        }
      } else {
        // Unexpected format, use response directly
        rawConfig = response;
      }

      console.log('Extracted config data:', JSON.stringify(rawConfig, null, 2));
      console.log('Raw config type:', typeof rawConfig);
      console.log(
        'Raw config keys:',
        rawConfig && typeof rawConfig === 'object'
          ? Object.keys(rawConfig)
          : 'No keys (not an object)'
      );

      // Check if rawConfig is null or undefined
      if (!rawConfig) {
        console.error('Raw config is null or undefined');
        // Use default values instead of throwing an error
        const defaultConfig = {
          worker_nodes: 1,
          memory: '2',
          cpu: 2,
          _debug:
            'Using default config because rawConfig was null or undefined',
        };

        console.log('Using default config:', defaultConfig);

        setConfigModal(prev => ({
          ...prev,
          config: defaultConfig,
          isLoading: false,
        }));
        return;
      }

      // Format the config data for the modal
      let formattedConfig;

      // Check if we have a valid config structure
      if (typeof rawConfig === 'object') {
        // Count worker nodes from the nodes array
        let workerNodeCount = 1; // Default to 1
        if (Array.isArray(rawConfig.nodes)) {
          workerNodeCount = rawConfig.nodes.filter(
            (node: any) =>
              node.role === 'worker' ||
              (typeof node === 'string' && node.includes('worker'))
          ).length;
        }

        // Extract memory and CPU from resource_limits
        let memory = '2';
        let cpu = 2;

        if (rawConfig.resource_limits && rawConfig.resource_limits.worker) {
          // Extract memory, removing any 'Gi' or 'GB' suffix
          if (rawConfig.resource_limits.worker.memory) {
            memory = rawConfig.resource_limits.worker.memory
              .replace('Gi', '')
              .replace('GB', '')
              .replace('G', '');
          }

          // Extract CPU
          if (rawConfig.resource_limits.worker.cpu) {
            cpu = parseInt(rawConfig.resource_limits.worker.cpu);
          }
        }

        // Transform the raw config into the format expected by the modal
        formattedConfig = {
          worker_nodes: workerNodeCount,
          memory: memory,
          cpu: cpu,
          // Store the original raw config for debugging
          _rawConfig: rawConfig,
          _responseType: typeof response,
          _hasDataProperty:
            response && typeof response === 'object' && 'data' in response,
        };

        console.log('Formatted config with worker nodes:', workerNodeCount);
      } else {
        // Fallback to default values if the structure is unexpected
        formattedConfig = {
          worker_nodes: 1,
          memory: '2',
          cpu: 2,
          _rawConfig: rawConfig,
          _debug: 'Using default config because rawConfig was not an object',
        };
      }

      console.log('Formatted config for modal:', formattedConfig);

      setConfigModal(prev => ({
        ...prev,
        config: formattedConfig,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error fetching cluster config:', error);

      // Use default values in case of error
      const defaultConfig = {
        worker_nodes: 1,
        memory: '2',
        cpu: 2,
        _error: error instanceof Error ? error.message : 'Unknown error',
      };

      console.log('Error occurred, using default config:', defaultConfig);

      setConfigModal(prev => ({
        ...prev,
        config: defaultConfig,
        isLoading: false,
      }));

      toast({
        title: 'Warning',
        description: 'Using default configuration values',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    // Enhanced initial fetch with better error handling and cache invalidation
    const initialFetch = async () => {
      console.log('🚀 Starting initial dashboard data fetch...');

      try {
        // Try a direct lightweight fetch with cache busting
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8020';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          try {
            controller.abort(
              new DOMException('Timeout exceeded', 'TimeoutError')
            );
          } catch (e) {
            console.warn('Error aborting controller:', e);
          }
        }, 8000); // 8 second timeout for initial fetch

        const cacheBuster = Date.now();
        const response = await fetch(
          `${apiUrl}/api/cluster/status?_=${cacheBuster}`,
          {
            signal: controller.signal,
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              Pragma: 'no-cache',
              Expires: '0',
            },
          }
        );

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Initial fetch successful:', data);

          if (data && data.data && data.data.clusters) {
            // Quick update with minimal processing
            setStats(prev => ({
              ...prev,
              clusters: data.data.clusters,
              clusterCount:
                data.data.cluster_count || data.data.clusters.length,
              nodeCount:
                data.data.node_count ||
                data.data.clusters.reduce(
                  (sum: number, c: any) => sum + (c.nodes || 1),
                  0
                ),
              refreshing: false,
              lastRefreshed: new Date(),
            }));
            console.log('✅ Initial dashboard data loaded successfully');
            return; // Skip full fetch if quick fetch succeeded
          }
        }
      } catch (err) {
        console.log(
          '⚠️ Initial fetch failed, falling back to full fetch...',
          err
        );
      }

      // Add a small delay before the full fetch to avoid overwhelming the backend
      setTimeout(() => {
        console.log('🔄 Starting full dashboard data fetch...');
        fetchClusterStats();
      }, 500);
    };

    // Start with the initial fetch
    initialFetch();

    // Set up event listener for cluster creation events
    const handleClusterCreated = (event: CustomEvent) => {
      console.log('🎉 Cluster creation event received:', event.detail);
      // Force a refresh when a cluster is created
      setTimeout(() => {
        console.log('🔄 Refreshing dashboard after cluster creation...');
        fetchClusterStats();
      }, 1000); // Small delay to allow backend to update
    };

    // Listen for cluster creation events
    window.addEventListener(
      'cluster-created',
      handleClusterCreated as EventListener
    );

    // Set up interval for periodic refresh with improved logic
    let fetchCounter = 0;
    const intervalId = setInterval(() => {
      fetchCounter++;

      // Do full fetches every 2nd time (2 minutes), lightweight checks otherwise
      if (fetchCounter % 2 === 0) {
        console.log('🔄 Periodic full refresh...');
        fetchClusterStats();
      } else {
        // Lightweight check for cluster count changes
        try {
          const apiUrl =
            process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8020';
          const cacheBuster = Date.now();

          // Try the list endpoint first as it's more reliable
          fetch(`${apiUrl}/api/cluster/list?_=${cacheBuster}`, {
            headers: {
              'Cache-Control': 'no-cache',
            },
          })
            .then(res => (res.ok ? res.json() : null))
            .then(data => {
              if (data && data.data && Array.isArray(data.data)) {
                const newCount = data.data.length;
                if (newCount !== stats.clusters.length) {
                  console.log(
                    `📊 Cluster count changed (${stats.clusters.length} -> ${newCount}), triggering refresh`
                  );
                  fetchClusterStats();
                }
              } else {
                // Fallback to status endpoint if list doesn't work
                return fetch(`${apiUrl}/api/cluster/status?_=${cacheBuster}`, {
                  headers: {
                    'Cache-Control': 'no-cache',
                  },
                });
              }
            })
            .then(res => (res && res.ok ? res.json() : null))
            .then(data => {
              if (data && data.data && data.data.clusters) {
                const newCount = data.data.clusters.length;
                if (newCount !== stats.clusters.length) {
                  console.log(
                    `📊 Cluster count changed (${stats.clusters.length} -> ${newCount}), triggering refresh`
                  );
                  fetchClusterStats();
                }
              }
            })
            .catch(err => {
              console.log('⚠️ Background check failed:', err);
            });
        } catch (err) {
          console.log('❌ Error in background check:', err);
        }
      }
    }, 60000); // Check every minute

    // Cleanup function
    return () => {
      clearInterval(intervalId);
      window.removeEventListener(
        'cluster-created',
        handleClusterCreated as EventListener
      );
    };
  }, [stats.clusters.length]); // Add dependency to track cluster count changes

  // Sample data for charts
  const resourceUsageData = [
    { label: 'CPU', value: stats.cpuUsage || 25 },
    { label: 'Memory', value: 48 },
    { label: 'Storage', value: 32 },
    { label: 'Network', value: 78 },
  ];

  const nodeTypeData = [
    { label: 'Control Plane', value: 1 },
    { label: 'Worker', value: stats.nodeCount > 1 ? stats.nodeCount - 1 : 2 },
  ];

  const weeklyActivityData = [
    { label: 'Mon', value: 5 },
    { label: 'Tue', value: 8 },
    { label: 'Wed', value: 12 },
    { label: 'Thu', value: 7 },
    { label: 'Fri', value: 15 },
    { label: 'Sat', value: 3 },
    { label: 'Sun', value: 2 },
  ];

  return (
    <DashboardLayout
      title='Dashboard'
      description='Overview of your Kind Kubernetes clusters'
      actions={
        <div className='flex gap-3'>
          <EnhancedButton
            variant='outline'
            icon={<RefreshCcw className='w-4 h-4' />}
            onClick={handleManualRefresh}
            loading={stats.refreshing}
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
      {stats.refreshing ? (
        <div className='grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'>
          <SkeletonStatsCard showTrend />
          <SkeletonStatsCard showProgress />
          <SkeletonStatsCard />
          <SkeletonStatsCard showTrend showProgress />
        </div>
      ) : (
        <DashboardGrid columns={4}>
          <StatsCard
            title='Total Clusters'
            value={stats.clusterCount}
            description={`Last updated: ${stats.lastRefreshed?.toLocaleTimeString() || 'Never'}`}
            icon={<Server className='w-7 h-7' />}
            className='dashboard-card dashboard-card-primary'
          />

          <StatsCard
            title='Total Nodes'
            value={stats.nodeCount}
            description='Worker and control plane nodes'
            icon={<Cpu className='w-7 h-7' />}
            trend={{ value: 10, label: 'since last week', positive: true }}
            className='dashboard-card dashboard-card-secondary'
          />

          <StatsCard
            title='Applications'
            value={0}
            description='Deploy your first application'
            icon={<Database className='w-7 h-7' />}
            className='dashboard-card dashboard-card-tertiary'
          />

          <StatsCard
            title='CPU Usage'
            value={`${stats.cpuUsage}%`}
            description='Current utilization'
            icon={<Activity className='w-7 h-7' />}
            className='dashboard-card dashboard-card-success'
          />
        </DashboardGrid>
      )}

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2'>
          <EnhancedCard
            variant='default'
            title='Clusters'
            icon={<Server className='h-5 w-5' />}
            headerAction={
              <div className='flex items-center gap-2'>
                <AnimatedButton
                  variant='outline'
                  size='sm'
                  icon={<RefreshCcw className='h-4 w-4' />}
                  onClick={handleManualRefresh}
                  loading={stats.refreshing}
                  animation='none'
                >
                  Refresh
                </AnimatedButton>
              </div>
            }
          >
            {stats.refreshing ? (
              <SkeletonTable rows={3} columns={4} />
            ) : stats.clusters.length === 0 ? (
              <div className='text-center py-12'>
                <motion.div
                  className='mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4'
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <Server className='h-8 w-8 text-primary' />
                </motion.div>
                <AnimatedText
                  text='No clusters found'
                  animation='fade'
                  className='text-xl md:text-2xl font-semibold mb-2'
                  delay={0.2}
                />
                <AnimatedText
                  text='Create your first Kind cluster to get started with your Kubernetes development environment'
                  animation='fade'
                  className='text-muted-foreground mb-6 max-w-md mx-auto'
                  delay={0.3}
                />
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Link href='/create-cluster'>
                    <AnimatedButton
                      variant='default'
                      size='lg'
                      icon={<Plus className='h-5 w-5' />}
                      className='shadow-md'
                      animation='bounce'
                    >
                      Create Cluster
                    </AnimatedButton>
                  </Link>
                </motion.div>
              </div>
            ) : (
              <AnimatedList
                className='grid gap-4'
                animation='slide-up'
                staggerDelay={0.1}
              >
                {stats.clusters.map((cluster, index) => (
                  <div
                    key={index}
                    className='border rounded-lg p-5 bg-card hover:border-primary/30 hover:shadow-md transition-all duration-300'
                  >
                    <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
                      <div className='flex items-center gap-3'>
                        <div className='p-2 sm:p-3 rounded-full bg-primary/10 flex-shrink-0'>
                          <Server className='h-5 w-5 sm:h-6 sm:w-6 text-primary' />
                        </div>
                        <div>
                          <div className='flex flex-wrap items-center gap-2'>
                            <h3 className='text-base sm:text-lg font-semibold'>
                              {cluster.name}
                            </h3>
                            <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success'>
                              <span className='w-1.5 h-1.5 rounded-full bg-success mr-1.5 animate-pulse'></span>
                              {cluster.status}
                            </span>
                          </div>
                          <div className='flex flex-wrap items-center gap-2 mt-1'>
                            <span className='text-xs sm:text-sm text-muted-foreground'>
                              Environment:{' '}
                              <span className='text-foreground'>
                                Production
                              </span>
                            </span>
                            <span className='hidden sm:inline text-muted-foreground'>
                              •
                            </span>
                            <span className='text-xs sm:text-sm text-muted-foreground'>
                              Nodes:{' '}
                              <span className='text-foreground'>
                                {cluster.nodes || 0}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className='flex flex-wrap gap-2 mt-2 md:mt-0'>
                        <EnhancedTooltip content='View cluster configuration'>
                          <AnimatedButton
                            variant='outline'
                            size='sm'
                            icon={<Eye className='h-4 w-4' />}
                            onClick={() => openConfigModal(cluster.name)}
                            animation='scale'
                            className='text-xs sm:text-sm'
                          >
                            <span className='hidden xs:inline'>Config</span>
                          </AnimatedButton>
                        </EnhancedTooltip>

                        <EnhancedTooltip content='Adjust resource limits for this cluster'>
                          <ResourceLimitsModal clusterName={cluster.name} />
                        </EnhancedTooltip>

                        <EnhancedTooltip content='Delete this cluster permanently'>
                          <DirectDeleteButton
                            clusterName={cluster.name}
                            onSuccess={() => fetchClusterStats()}
                            variant='destructive'
                            size='sm'
                            showText={true}
                          />
                        </EnhancedTooltip>
                      </div>
                    </div>
                  </div>
                ))}
              </AnimatedList>
            )}
          </EnhancedCard>
        </div>

        <div className='grid grid-cols-1 gap-6'>
          <EnhancedCard
            title='Resource Usage'
            icon={<BarChart3 className='w-5 h-5' />}
            className='h-full'
          >
            <div className='space-y-4 p-4'>
              {resourceUsageData.map((item, index) => (
                <div key={index} className='space-y-1'>
                  <div className='flex justify-between text-sm'>
                    <span>{item.label}</span>
                    <span className='font-medium'>{item.value}%</span>
                  </div>
                  <AnimatedProgress
                    value={item.value}
                    variant={index % 2 === 0 ? 'gradient' : 'striped'}
                    color={
                      index === 0
                        ? 'primary'
                        : index === 1
                          ? 'secondary'
                          : index === 2
                            ? 'tertiary'
                            : 'info'
                    }
                    animationDelay={index * 0.1}
                  />
                </div>
              ))}
            </div>
          </EnhancedCard>

          <EnhancedCard
            title='Node Types'
            icon={<PieChart className='w-5 h-5' />}
            className='h-full'
          >
            <div className='flex justify-center py-4'>
              <DonutChart data={nodeTypeData} size={180} thickness={30} />
            </div>
          </EnhancedCard>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2'>
          <EnhancedCard
            title='Weekly Activity'
            icon={<BarChart3 className='w-5 h-5' />}
            className='h-full'
          >
            <div className='p-4 h-64'>
              <BarChart
                data={weeklyActivityData}
                height={250}
                colorScheme='gradient'
              />
            </div>
          </EnhancedCard>
        </div>
        <div>
          <EnhancedCard
            title='Recent Activity'
            icon={<Clock className='w-5 h-5' />}
            headerAction={
              <EnhancedButton
                variant='ghost'
                size='icon'
                onClick={() => {}}
                icon={<RefreshCcw className='w-4 h-4' />}
              />
            }
            className='h-full'
          >
            <div className='p-4'>
              <AnimatedSection
                animation='stagger-children'
                staggerChildren={0.1}
              >
                <div className='space-y-6'>
                  <div className='flex'>
                    <div className='flex flex-col items-center mr-4'>
                      <div className='rounded-full w-4 h-4 bg-success' />
                      <div className='h-full w-0.5 bg-border mt-1' />
                    </div>
                    <div className='pb-5'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <span className='font-medium'>Cluster Created</span>
                        <span className='text-xs text-muted-foreground'>
                          2 hours ago
                        </span>
                      </div>
                      <p className='text-sm text-muted-foreground mt-1'>
                        New cluster "production" was created
                      </p>
                    </div>
                  </div>

                  <div className='flex'>
                    <div className='flex flex-col items-center mr-4'>
                      <div className='rounded-full w-4 h-4 bg-success' />
                      <div className='h-full w-0.5 bg-border mt-1' />
                    </div>
                    <div className='pb-5'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <span className='font-medium'>
                          Application Deployed
                        </span>
                        <span className='text-xs text-muted-foreground'>
                          1 hour ago
                        </span>
                      </div>
                      <p className='text-sm text-muted-foreground mt-1'>
                        Deployed web application to "production"
                      </p>
                    </div>
                  </div>

                  <div className='flex'>
                    <div className='flex flex-col items-center mr-4'>
                      <div className='rounded-full w-4 h-4 bg-primary animate-pulse' />
                      <div className='h-full w-0.5 bg-border mt-1' />
                    </div>
                    <div className='pb-5'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <span className='font-medium'>Scaling Nodes</span>
                        <span className='text-xs text-muted-foreground'>
                          In progress
                        </span>
                      </div>
                      <p className='text-sm text-muted-foreground mt-1'>
                        Adding 2 worker nodes to "production"
                      </p>
                    </div>
                  </div>

                  <div className='flex'>
                    <div className='flex flex-col items-center mr-4'>
                      <div className='rounded-full w-4 h-4 bg-muted' />
                    </div>
                    <div>
                      <div className='flex flex-wrap items-center gap-2'>
                        <span className='font-medium'>
                          Scheduled Maintenance
                        </span>
                        <span className='text-xs text-muted-foreground'>
                          Tomorrow
                        </span>
                      </div>
                      <p className='text-sm text-muted-foreground mt-1'>
                        Upgrading Kubernetes version
                      </p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            </div>
          </EnhancedCard>
        </div>
      </div>

      {/* Cluster Configuration Modal */}
      <ClusterConfigModal
        isOpen={configModal.isOpen}
        onClose={() => setConfigModal(prev => ({ ...prev, isOpen: false }))}
        clusterName={configModal.clusterName}
        config={configModal.config}
        isLoading={configModal.isLoading}
      />

      {/* Resource Limits Modals - Only render them when needed, not at the bottom of the page */}

      {/* Success notification when a cluster is created */}
      <AnimatedNotification
        type='success'
        title='Cluster Created'
        message='Your Kubernetes cluster has been successfully created.'
        isOpen={stats.clusterCount > 0 && stats.lastRefreshed !== null}
        duration={5000}
        position='bottom-right'
        action={{
          label: 'View Details',
          onClick: () => {
            if (stats.clusters.length > 0) {
              openConfigModal(stats.clusters[0].name);
            }
          },
        }}
      />

      {/* Guided tour */}
      <DashboardTour />
    </DashboardLayout>
  );
}
