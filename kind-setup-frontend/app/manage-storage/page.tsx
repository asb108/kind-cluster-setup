'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertCircle,
  Search,
  Filter,
  HardDrive,
  Database,
  Layers,
  BarChart3,
  RefreshCw,
  Trash2,
  Eye,
  Plus,
  Download,
  Upload,
  Settings,
  Info,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import type {
  StorageClass,
  PersistentVolume,
  PersistentVolumeClaim,
  StorageMetrics,
  StorageOverview,
  StorageEvent,
} from './types';

// Mock data for development - replace with actual API calls
const mockStorageOverview: StorageOverview = {
  clusters: ['kind-dev', 'kind-test', 'kind-prod'],
  total_pvs: 12,
  total_pvcs: 8,
  total_storage_classes: 3,
  total_capacity: '100Gi',
  used_capacity: '45Gi',
  metrics_by_cluster: {
    'kind-dev': {
      total_capacity: '50Gi',
      used_capacity: '20Gi',
      available_capacity: '30Gi',
      utilization_percentage: 40,
      pv_count: 6,
      pvc_count: 4,
      storage_class_count: 2,
      cluster: 'kind-dev',
    },
    'kind-test': {
      total_capacity: '30Gi',
      used_capacity: '15Gi',
      available_capacity: '15Gi',
      utilization_percentage: 50,
      pv_count: 4,
      pvc_count: 3,
      storage_class_count: 1,
      cluster: 'kind-test',
    },
    'kind-prod': {
      total_capacity: '20Gi',
      used_capacity: '10Gi',
      available_capacity: '10Gi',
      utilization_percentage: 50,
      pv_count: 2,
      pvc_count: 1,
      storage_class_count: 1,
      cluster: 'kind-prod',
    },
  },
};

const mockStorageClasses: StorageClass[] = [
  {
    name: 'standard',
    provisioner: 'rancher.io/local-path',
    reclaim_policy: 'Delete',
    volume_binding_mode: 'WaitForFirstConsumer',
    allow_volume_expansion: true,
    parameters: { hostPath: '/tmp/local-path-provisioner' },
    cluster: 'kind-dev',
    is_default: true,
    created_at: '2024-01-15T10:30:00Z',
  },
  {
    name: 'fast-ssd',
    provisioner: 'kubernetes.io/host-path',
    reclaim_policy: 'Retain',
    volume_binding_mode: 'Immediate',
    allow_volume_expansion: false,
    parameters: { type: 'DirectoryOrCreate' },
    cluster: 'kind-dev',
    is_default: false,
    created_at: '2024-01-16T14:20:00Z',
  },
];

const mockPersistentVolumes: PersistentVolume[] = [
  {
    name: 'pvc-airflow-postgres',
    capacity: '10Gi',
    access_modes: ['ReadWriteOnce'],
    reclaim_policy: 'Delete',
    status: 'Bound',
    claim: 'airflow/postgres-pvc',
    storage_class: 'standard',
    cluster: 'kind-dev',
    created_at: '2024-01-15T11:00:00Z',
    host_path: '/tmp/local-path-provisioner/pvc-airflow-postgres',
  },
  {
    name: 'pvc-mysql-data',
    capacity: '20Gi',
    access_modes: ['ReadWriteOnce'],
    reclaim_policy: 'Delete',
    status: 'Bound',
    claim: 'default/mysql-data-pvc',
    storage_class: 'standard',
    cluster: 'kind-dev',
    created_at: '2024-01-16T09:30:00Z',
    host_path: '/tmp/local-path-provisioner/pvc-mysql-data',
  },
];

const mockPersistentVolumeClaims: PersistentVolumeClaim[] = [
  {
    name: 'postgres-pvc',
    namespace: 'airflow',
    status: 'Bound',
    volume: 'pvc-airflow-postgres',
    capacity: '10Gi',
    access_modes: ['ReadWriteOnce'],
    storage_class: 'standard',
    cluster: 'kind-dev',
    created_at: '2024-01-15T11:00:00Z',
    requested_storage: '10Gi',
    used_storage: '2.5Gi',
    app_label: 'airflow',
  },
  {
    name: 'mysql-data-pvc',
    namespace: 'default',
    status: 'Bound',
    volume: 'pvc-mysql-data',
    capacity: '20Gi',
    access_modes: ['ReadWriteOnce'],
    storage_class: 'standard',
    cluster: 'kind-dev',
    created_at: '2024-01-16T09:30:00Z',
    requested_storage: '20Gi',
    used_storage: '5.2Gi',
    app_label: 'mysql',
  },
];

// Helper functions
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'bound':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'available':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'released':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const formatBytes = (bytes: string) => {
  if (!bytes) return 'N/A';
  return bytes;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function ManageStorage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCluster, setSelectedCluster] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Data states
  const [storageOverview, setStorageOverview] =
    useState<StorageOverview | null>(null);
  const [storageClasses, setStorageClasses] = useState<StorageClass[]>([]);
  const [persistentVolumes, setPersistentVolumes] = useState<
    PersistentVolume[]
  >([]);
  const [persistentVolumeClaims, setPersistentVolumeClaims] = useState<
    PersistentVolumeClaim[]
  >([]);

  // Dialog states
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [resourceType, setResourceType] = useState<string>('');

  const { toast } = useToast();

  // Load storage data
  const loadStorageData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with actual API calls
      // const overview = await storageApi.getStorageOverview()
      // const classes = await storageApi.getStorageClasses()
      // const pvs = await storageApi.getPersistentVolumes()
      // const pvcs = await storageApi.getPersistentVolumeClaims()

      // Mock data for now
      await new Promise(resolve => setTimeout(resolve, 1000));

      setStorageOverview(mockStorageOverview);
      setStorageClasses(mockStorageClasses);
      setPersistentVolumes(mockPersistentVolumes);
      setPersistentVolumeClaims(mockPersistentVolumeClaims);
    } catch (err) {
      console.error('Failed to load storage data:', err);
      setError('Failed to load storage data. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to load storage data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadStorageData();
  }, [loadStorageData]);

  // Filter data based on cluster and search
  const filteredStorageClasses = storageClasses.filter(
    sc =>
      (selectedCluster === 'all' || sc.cluster === selectedCluster) &&
      (searchTerm === '' ||
        sc.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredPVs = persistentVolumes.filter(
    pv =>
      (selectedCluster === 'all' || pv.cluster === selectedCluster) &&
      (searchTerm === '' ||
        pv.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredPVCs = persistentVolumeClaims.filter(
    pvc =>
      (selectedCluster === 'all' || pvc.cluster === selectedCluster) &&
      (searchTerm === '' ||
        pvc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pvc.namespace.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle resource details
  const showResourceDetails = (resource: any, type: string) => {
    setSelectedResource(resource);
    setResourceType(type);
    setDetailsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className='container mx-auto p-6 space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold'>Storage Management</h1>
            <p className='text-muted-foreground'>
              Manage storage resources across your Kind clusters
            </p>
          </div>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          {[...Array(4)].map((_, i) => (
            <Card key={i} className='animate-pulse'>
              <CardHeader className='pb-2'>
                <div className='h-4 bg-gray-200 rounded w-3/4'></div>
              </CardHeader>
              <CardContent>
                <div className='h-8 bg-gray-200 rounded w-1/2'></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='container mx-auto p-6'>
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className='container mx-auto p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Storage Management</h1>
          <p className='text-muted-foreground'>
            Manage storage resources across your Kind clusters
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            onClick={loadStorageData}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      {storageOverview && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium flex items-center'>
                <HardDrive className='h-4 w-4 mr-2' />
                Persistent Volumes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {storageOverview.total_pvs}
              </div>
              <p className='text-xs text-muted-foreground'>
                Across {storageOverview.clusters.length} clusters
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium flex items-center'>
                <Database className='h-4 w-4 mr-2' />
                Volume Claims
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {storageOverview.total_pvcs}
              </div>
              <p className='text-xs text-muted-foreground'>Active claims</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium flex items-center'>
                <Layers className='h-4 w-4 mr-2' />
                Storage Classes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {storageOverview.total_storage_classes}
              </div>
              <p className='text-xs text-muted-foreground'>Available classes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium flex items-center'>
                <BarChart3 className='h-4 w-4 mr-2' />
                Total Capacity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {storageOverview.total_capacity}
              </div>
              <p className='text-xs text-muted-foreground'>
                {storageOverview.used_capacity} used
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className='flex flex-col sm:flex-row gap-4'>
        <div className='flex-1'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />
            <Input
              placeholder='Search storage resources...'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className='pl-10'
            />
          </div>
        </div>
        <Select value={selectedCluster} onValueChange={setSelectedCluster}>
          <SelectTrigger className='w-[200px]'>
            <SelectValue placeholder='Select cluster' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Clusters</SelectItem>
            {storageOverview?.clusters.map(cluster => (
              <SelectItem key={cluster} value={cluster}>
                {cluster}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main Content Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className='space-y-4'
      >
        <TabsList className='grid w-full grid-cols-4'>
          <TabsTrigger value='overview'>Overview</TabsTrigger>
          <TabsTrigger value='storage-classes'>Storage Classes</TabsTrigger>
          <TabsTrigger value='persistent-volumes'>
            Persistent Volumes
          </TabsTrigger>
          <TabsTrigger value='volume-claims'>Volume Claims</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value='overview' className='space-y-4'>
          {storageOverview && (
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              {/* Cluster Storage Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Storage by Cluster</CardTitle>
                  <CardDescription>
                    Storage utilization across clusters
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  {Object.entries(storageOverview.metrics_by_cluster).map(
                    ([cluster, metrics]) => (
                      <div key={cluster} className='space-y-2'>
                        <div className='flex justify-between items-center'>
                          <span className='font-medium'>{cluster}</span>
                          <span className='text-sm text-muted-foreground'>
                            {metrics.used_capacity} / {metrics.total_capacity}
                          </span>
                        </div>
                        <Progress
                          value={metrics.utilization_percentage}
                          className='h-2'
                        />
                        <div className='flex justify-between text-xs text-muted-foreground'>
                          <span>
                            {metrics.pv_count} PVs, {metrics.pvc_count} PVCs
                          </span>
                          <span>{metrics.utilization_percentage}% used</span>
                        </div>
                      </div>
                    )
                  )}
                </CardContent>
              </Card>

              {/* Recent Storage Events */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Storage Events</CardTitle>
                  <CardDescription>
                    Latest storage-related events
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='space-y-3'>
                    <div className='flex items-start space-x-3'>
                      <div className='w-2 h-2 bg-green-500 rounded-full mt-2'></div>
                      <div className='flex-1'>
                        <p className='text-sm font-medium'>
                          PVC postgres-pvc bound successfully
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          kind-dev • 2 minutes ago
                        </p>
                      </div>
                    </div>
                    <div className='flex items-start space-x-3'>
                      <div className='w-2 h-2 bg-blue-500 rounded-full mt-2'></div>
                      <div className='flex-1'>
                        <p className='text-sm font-medium'>
                          Storage class fast-ssd created
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          kind-dev • 1 hour ago
                        </p>
                      </div>
                    </div>
                    <div className='flex items-start space-x-3'>
                      <div className='w-2 h-2 bg-yellow-500 rounded-full mt-2'></div>
                      <div className='flex-1'>
                        <p className='text-sm font-medium'>
                          PV pvc-mysql-data provisioned
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          kind-dev • 3 hours ago
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Storage Classes Tab */}
        <TabsContent value='storage-classes' className='space-y-4'>
          <div className='grid gap-4'>
            {filteredStorageClasses.map(storageClass => (
              <Card key={`${storageClass.cluster}-${storageClass.name}`}>
                <CardHeader>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-3'>
                      <Layers className='h-5 w-5' />
                      <div>
                        <CardTitle className='text-lg'>
                          {storageClass.name}
                        </CardTitle>
                        <CardDescription>
                          {storageClass.provisioner} • {storageClass.cluster}
                        </CardDescription>
                      </div>
                    </div>
                    <div className='flex items-center space-x-2'>
                      {storageClass.is_default && (
                        <Badge variant='secondary'>Default</Badge>
                      )}
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          showResourceDetails(storageClass, 'storage-class')
                        }
                      >
                        <Eye className='h-4 w-4 mr-2' />
                        Details
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
                    <div>
                      <span className='font-medium'>Reclaim Policy:</span>
                      <p className='text-muted-foreground'>
                        {storageClass.reclaim_policy}
                      </p>
                    </div>
                    <div>
                      <span className='font-medium'>Binding Mode:</span>
                      <p className='text-muted-foreground'>
                        {storageClass.volume_binding_mode}
                      </p>
                    </div>
                    <div>
                      <span className='font-medium'>Expansion:</span>
                      <p className='text-muted-foreground'>
                        {storageClass.allow_volume_expansion
                          ? 'Allowed'
                          : 'Not Allowed'}
                      </p>
                    </div>
                    <div>
                      <span className='font-medium'>Created:</span>
                      <p className='text-muted-foreground'>
                        {formatDate(storageClass.created_at)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Persistent Volumes Tab */}
        <TabsContent value='persistent-volumes' className='space-y-4'>
          <div className='grid gap-4'>
            {filteredPVs.map(pv => (
              <Card key={`${pv.cluster}-${pv.name}`}>
                <CardHeader>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-3'>
                      <HardDrive className='h-5 w-5' />
                      <div>
                        <CardTitle className='text-lg'>{pv.name}</CardTitle>
                        <CardDescription>
                          {pv.capacity} • {pv.cluster}
                        </CardDescription>
                      </div>
                    </div>
                    <div className='flex items-center space-x-2'>
                      <Badge className={getStatusColor(pv.status)}>
                        {pv.status}
                      </Badge>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          showResourceDetails(pv, 'persistent-volume')
                        }
                      >
                        <Eye className='h-4 w-4 mr-2' />
                        Details
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
                    <div>
                      <span className='font-medium'>Access Modes:</span>
                      <p className='text-muted-foreground'>
                        {pv.access_modes.join(', ')}
                      </p>
                    </div>
                    <div>
                      <span className='font-medium'>Reclaim Policy:</span>
                      <p className='text-muted-foreground'>
                        {pv.reclaim_policy}
                      </p>
                    </div>
                    <div>
                      <span className='font-medium'>Storage Class:</span>
                      <p className='text-muted-foreground'>
                        {pv.storage_class || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className='font-medium'>Claim:</span>
                      <p className='text-muted-foreground'>
                        {pv.claim || 'Unbound'}
                      </p>
                    </div>
                  </div>
                  {pv.host_path && (
                    <div className='mt-3 pt-3 border-t'>
                      <span className='font-medium text-sm'>Host Path:</span>
                      <p className='text-sm text-muted-foreground font-mono'>
                        {pv.host_path}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Volume Claims Tab */}
        <TabsContent value='volume-claims' className='space-y-4'>
          <div className='grid gap-4'>
            {filteredPVCs.map(pvc => (
              <Card key={`${pvc.cluster}-${pvc.namespace}-${pvc.name}`}>
                <CardHeader>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-3'>
                      <Database className='h-5 w-5' />
                      <div>
                        <CardTitle className='text-lg'>{pvc.name}</CardTitle>
                        <CardDescription>
                          {pvc.namespace} • {pvc.cluster}
                        </CardDescription>
                      </div>
                    </div>
                    <div className='flex items-center space-x-2'>
                      <Badge className={getStatusColor(pvc.status)}>
                        {pvc.status}
                      </Badge>
                      {pvc.app_label && (
                        <Badge variant='outline'>{pvc.app_label}</Badge>
                      )}
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() =>
                          showResourceDetails(pvc, 'persistent-volume-claim')
                        }
                      >
                        <Eye className='h-4 w-4 mr-2' />
                        Details
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
                    <div>
                      <span className='font-medium'>Requested:</span>
                      <p className='text-muted-foreground'>
                        {pvc.requested_storage}
                      </p>
                    </div>
                    <div>
                      <span className='font-medium'>Capacity:</span>
                      <p className='text-muted-foreground'>
                        {pvc.capacity || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className='font-medium'>Used:</span>
                      <p className='text-muted-foreground'>
                        {pvc.used_storage || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className='font-medium'>Access Modes:</span>
                      <p className='text-muted-foreground'>
                        {pvc.access_modes.join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className='mt-3 pt-3 border-t'>
                    <div className='grid grid-cols-2 gap-4 text-sm'>
                      <div>
                        <span className='font-medium'>Storage Class:</span>
                        <p className='text-muted-foreground'>
                          {pvc.storage_class || 'Default'}
                        </p>
                      </div>
                      <div>
                        <span className='font-medium'>Volume:</span>
                        <p className='text-muted-foreground'>
                          {pvc.volume || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Resource Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className='max-w-4xl max-h-[80vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>
              {resourceType === 'storage-class' && 'Storage Class Details'}
              {resourceType === 'persistent-volume' &&
                'Persistent Volume Details'}
              {resourceType === 'persistent-volume-claim' &&
                'Persistent Volume Claim Details'}
            </DialogTitle>
            <DialogDescription>
              Detailed information about the selected storage resource
            </DialogDescription>
          </DialogHeader>

          {selectedResource && (
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label className='font-medium'>Name</Label>
                  <p className='text-sm text-muted-foreground'>
                    {selectedResource.name}
                  </p>
                </div>
                <div>
                  <Label className='font-medium'>Cluster</Label>
                  <p className='text-sm text-muted-foreground'>
                    {selectedResource.cluster}
                  </p>
                </div>
              </div>

              {resourceType === 'storage-class' && (
                <div className='space-y-4'>
                  <Separator />
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <Label className='font-medium'>Provisioner</Label>
                      <p className='text-sm text-muted-foreground'>
                        {selectedResource.provisioner}
                      </p>
                    </div>
                    <div>
                      <Label className='font-medium'>Reclaim Policy</Label>
                      <p className='text-sm text-muted-foreground'>
                        {selectedResource.reclaim_policy}
                      </p>
                    </div>
                    <div>
                      <Label className='font-medium'>Volume Binding Mode</Label>
                      <p className='text-sm text-muted-foreground'>
                        {selectedResource.volume_binding_mode}
                      </p>
                    </div>
                    <div>
                      <Label className='font-medium'>
                        Allow Volume Expansion
                      </Label>
                      <p className='text-sm text-muted-foreground'>
                        {selectedResource.allow_volume_expansion ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>
                  {Object.keys(selectedResource.parameters).length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <Label className='font-medium'>Parameters</Label>
                        <div className='mt-2 space-y-1'>
                          {Object.entries(selectedResource.parameters).map(
                            ([key, value]) => (
                              <div
                                key={key}
                                className='flex justify-between text-sm'
                              >
                                <span className='font-mono'>{key}:</span>
                                <span className='text-muted-foreground'>
                                  {String(value)}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {(resourceType === 'persistent-volume' ||
                resourceType === 'persistent-volume-claim') && (
                <div className='space-y-4'>
                  <Separator />
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <Label className='font-medium'>Status</Label>
                      <Badge
                        className={getStatusColor(selectedResource.status)}
                      >
                        {selectedResource.status}
                      </Badge>
                    </div>
                    <div>
                      <Label className='font-medium'>Capacity</Label>
                      <p className='text-sm text-muted-foreground'>
                        {selectedResource.capacity ||
                          selectedResource.requested_storage}
                      </p>
                    </div>
                    <div>
                      <Label className='font-medium'>Access Modes</Label>
                      <p className='text-sm text-muted-foreground'>
                        {selectedResource.access_modes.join(', ')}
                      </p>
                    </div>
                    <div>
                      <Label className='font-medium'>Storage Class</Label>
                      <p className='text-sm text-muted-foreground'>
                        {selectedResource.storage_class || 'Default'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Separator />
              <div>
                <Label className='font-medium'>Created</Label>
                <p className='text-sm text-muted-foreground'>
                  {formatDate(selectedResource.created_at)}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
