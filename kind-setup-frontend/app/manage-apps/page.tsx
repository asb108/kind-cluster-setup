'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, Search, Filter, Play, Square, RotateCcw, Trash2, Eye, BarChart3, Settings, ExternalLink, EyeOff, Globe, Monitor, Database } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { clusterApi } from '@/services/api'
import type { Application, AppDetails, AppMetrics } from '@/services/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'

// Enhanced Application Management Interface

// Helper function to get icon for access URL type
const getAccessUrlIcon = (type: string, appName: string) => {
  if (type === 'PortForward') return Monitor
  if (type === 'NodePort') return Globe
  if (type === 'LoadBalancer') return Globe

  // App-specific icons
  if (appName.toLowerCase().includes('airflow')) return Monitor
  if (appName.toLowerCase().includes('database') || appName.toLowerCase().includes('postgres') || appName.toLowerCase().includes('mysql')) return Database

  return Globe
}

// Helper function to get access URL color
const getAccessUrlColor = (type: string) => {
  switch (type) {
    case 'PortForward': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'NodePort': return 'bg-green-100 text-green-800 border-green-200'
    case 'LoadBalancer': return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'Standard': return 'bg-orange-100 text-orange-800 border-orange-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

// Main page component
export default function ManageApps() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [apps, setApps] = useState<Application[]>([])
  const [filteredApps, setFilteredApps] = useState<Application[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [clusterFilter, setClusterFilter] = useState('all')
  const [hideSystemComponents, setHideSystemComponents] = useState(true) // Hide system components by default
  const [availableClusters, setAvailableClusters] = useState<string[]>([]) // All available clusters

  // Dialog states
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [logsDialogOpen, setLogsDialogOpen] = useState(false)
  const [metricsDialogOpen, setMetricsDialogOpen] = useState(false)
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false)
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)

  // Data states
  const [appDetails, setAppDetails] = useState<AppDetails | null>(null)
  const [appLogs, setAppLogs] = useState<string>('')
  const [appMetrics, setAppMetrics] = useState<AppMetrics | null>(null)
  const [scaleReplicas, setScaleReplicas] = useState(1)

  // Loading states
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Port forwarding state
  const [portForwardStatus, setPortForwardStatus] = useState<{[key: string]: any}>({})
  const [portForwardLoading, setPortForwardLoading] = useState<{[key: string]: boolean}>({})

  // Helper function to identify system components
  const isSystemComponent = (app: Application): boolean => {
    const systemNamespaces = [
      'kube-system',
      'kube-public',
      'kube-node-lease',
      'local-path-storage',
      'ingress-nginx',
      'cert-manager',
      'monitoring',
      'logging'
    ]

    const systemAppNames = [
      'local-path-provisioner',
      'coredns',
      'kube-proxy',
      'kindnet',
      'etcd',
      'kube-apiserver',
      'kube-controller-manager',
      'kube-scheduler'
    ]

    return systemNamespaces.includes(app.namespace || '') ||
           systemAppNames.includes(app.name?.toLowerCase() || '')
  }

  // Load available clusters
  const loadClusters = useCallback(async () => {
    try {
      console.log('Fetching available clusters from API...')
      const clusterStatus = await clusterApi.getClusterStatus()
      console.log('Cluster status received:', clusterStatus)

      // Extract cluster names from the response
      if (clusterStatus.clusters && Array.isArray(clusterStatus.clusters)) {
        const clusterNames = clusterStatus.clusters.map(cluster => cluster.name)
        setAvailableClusters(clusterNames)
        console.log('Available clusters:', clusterNames)
      } else {
        console.warn('No clusters found in API response')
        setAvailableClusters([])
      }
    } catch (err) {
      console.error('Error loading clusters:', err)
      setAvailableClusters([])
    }
  }, [])

  // Refresh data function
  const refreshData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [clustersResult, appsResult] = await Promise.all([
        clusterApi.getClusterStatus(),
        clusterApi.getApplications(!hideSystemComponents)
      ])

      // Extract cluster names from the cluster status response
      if (clustersResult.clusters && Array.isArray(clustersResult.clusters)) {
        const clusterNames = clustersResult.clusters.map(cluster => cluster.name)
        setAvailableClusters(clusterNames)
      }
      setApps(Array.isArray(appsResult) ? appsResult : [])
      setLoading(false)
    } catch (err) {
      console.error('❌ Error refreshing data:', err)
      setError('Failed to refresh data. Make sure your backend is running.')
      setLoading(false)
    }
  }, [hideSystemComponents])

  // Filter applications based on search and filters
  useEffect(() => {
    // Ensure apps is always an array before filtering
    const appsArray = Array.isArray(apps) ? apps : []
    let filtered = appsArray

    // Apply system components filter first
    if (hideSystemComponents) {
      filtered = filtered.filter(app => !isSystemComponent(app))
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(app =>
        app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.display_name && app.display_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (app.description && app.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status?.toLowerCase() === statusFilter.toLowerCase())
    }

    // Apply cluster filter
    if (clusterFilter !== 'all') {
      filtered = filtered.filter(app => app.cluster === clusterFilter)
    }

    setFilteredApps(filtered)
  }, [apps, searchTerm, statusFilter, clusterFilter, hideSystemComponents])

  useEffect(() => {
    console.log('🚀 ManageApps component mounted, starting to load data...')

    // Load data directly without complex logic
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Load clusters and apps in parallel
        const [clustersResult, appsResult] = await Promise.all([
          clusterApi.getClusterStatus(),
          clusterApi.getApplications(!hideSystemComponents)
        ])

        // Extract cluster names from the cluster status response
        if (clustersResult.clusters && Array.isArray(clustersResult.clusters)) {
          const clusterNames = clustersResult.clusters.map(cluster => cluster.name)
          setAvailableClusters(clusterNames)
        }
        setApps(Array.isArray(appsResult) ? appsResult : [])
        setLoading(false)
      } catch (err) {
        console.error('❌ Error loading data:', err)
        setError('Failed to load data. Make sure your backend is running.')
        setLoading(false)
      }
    }

    loadData()
  }, [hideSystemComponents])

  // Note: hideSystemComponents changes are handled by the main useEffect dependency

  // Check port forwarding status for all apps when they load
  useEffect(() => {
    if (apps.length > 0) {
      apps.forEach(app => {
        if (!isSystemComponent(app)) {
          checkPortForwardStatus(app)
        }
      })
    }
  }, [apps])

  const { toast } = useToast()

  // Management action handlers
  const handleAppAction = async (app: Application, action: string) => {
    setActionLoading(`${app.id}-${action}`)
    try {
      await clusterApi.manageApplication(app.id, action, app.cluster || 'default', app.namespace || 'default')
      toast({
        title: 'Success',
        description: `Application ${action} completed successfully`,
      })
      await refreshData() // Refresh the list
    } catch (err) {
      console.error(`Error ${action} application:`, err)
      toast({
        title: 'Error',
        description: `Failed to ${action} application: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteApp = async (app: Application) => {
    if (!confirm(`Are you sure you want to delete ${app.name}? This action cannot be undone.`)) {
      return
    }

    setActionLoading(`${app.id}-delete`)
    try {
      await clusterApi.deleteApplication(app.id, app.name, app.cluster)
      toast({
        title: 'Success',
        description: `Application ${app.name} deleted successfully`,
      })
      await refreshData() // Refresh the list
    } catch (err) {
      console.error('Error deleting application:', err)
      toast({
        title: 'Error',
        description: `Failed to delete application: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteAppWithAllResources = async (app: Application) => {
    const confirmMessage = `⚠️ COMPREHENSIVE DELETE ⚠️

This will delete ALL resources related to "${app.name}":
• Deployments, StatefulSets, DaemonSets
• Services, ConfigMaps, Secrets
• PersistentVolumeClaims, Ingresses
• Any other related Kubernetes resources

This action CANNOT be undone!

Are you absolutely sure you want to proceed?`

    if (!confirm(confirmMessage)) {
      return
    }

    setActionLoading(`${app.id}-delete-all`)
    try {
      const result = await clusterApi.deleteApplicationWithAllResources(
        app.id,
        app.name,
        app.cluster,
        app.namespace
      )

      toast({
        title: 'Comprehensive Delete Completed',
        description: `All resources for ${app.name} have been deleted`,
      })

      console.log('Comprehensive delete result:', result)
      await refreshData() // Refresh the list
    } catch (err) {
      console.error('Error in comprehensive delete:', err)
      toast({
        title: 'Comprehensive Delete Failed',
        description: `Failed to delete all resources: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleScaleApp = async () => {
    if (!selectedApp) return

    setActionLoading(`${selectedApp.id}-scale`)
    try {
      await clusterApi.scaleApplication(selectedApp.id, scaleReplicas, selectedApp.cluster || 'default', selectedApp.namespace || 'default')
      toast({
        title: 'Success',
        description: `Application scaled to ${scaleReplicas} replicas`,
      })
      setScaleDialogOpen(false)
      await refreshData() // Refresh the list
    } catch (err) {
      console.error('Error scaling application:', err)
      toast({
        title: 'Error',
        description: `Failed to scale application: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
      })
    } finally {
      setActionLoading(null)
    }
  }

  // Data fetching functions
  const fetchAppDetails = async (app: Application) => {
    try {
      const response = await clusterApi.getApplicationDetails(app.id, app.cluster || 'test-cluster', app.namespace || 'dev')
      setAppDetails(response.data)
    } catch (err) {
      console.error('Error fetching app details:', err)
      toast({
        title: 'Error',
        description: `Failed to fetch application details: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
      })
      setAppDetails(null)
    }
  }

  const fetchAppLogs = async (app: Application) => {
    try {
      const response = await clusterApi.getApplicationLogs(app.id, app.cluster || 'test-cluster', app.namespace || 'dev', 200)
      setAppLogs(response.data.logs || 'No logs available')
    } catch (err) {
      console.error('Error fetching app logs:', err)
      setAppLogs(`Failed to fetch logs: ${err instanceof Error ? err.message : 'Unknown error'}

This could be because:
- The backend server is not running
- The application is not deployed
- The cluster or namespace is incorrect
- The application ID is invalid

Please check the backend server status and try again.`)
      toast({
        title: 'Error',
        description: `Failed to fetch application logs: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
      })
    }
  }

  const fetchAppMetrics = async (app: Application) => {
    try {
      const response = await clusterApi.getApplicationMetrics(app.id, app.cluster || 'test-cluster', app.namespace || 'dev')
      setAppMetrics(response.data)
    } catch (err) {
      console.error('Error fetching app metrics:', err)
      toast({
        title: 'Error',
        description: `Failed to fetch application metrics: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
      })
      setAppMetrics(null)
    }
  }

  // Port forwarding handlers
  const handleStartPortForward = async (app: Application) => {
    const appKey = `${app.id}-${app.cluster}-${app.namespace}`
    setPortForwardLoading(prev => ({ ...prev, [appKey]: true }))

    try {
      const result = await clusterApi.startPortForward(
        app.id,
        app.cluster || 'default',
        app.namespace || 'default'
      )

      if (result.data) {
        setPortForwardStatus(prev => ({ ...prev, [appKey]: result.data }))
        toast({
          title: 'Port Forward Started',
          description: `Application is now accessible at ${result.data.access_url}`,
        })
      }
    } catch (err) {
      console.error('Error starting port forward:', err)
      toast({
        title: 'Error',
        description: `Failed to start port forwarding: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
      })
    } finally {
      setPortForwardLoading(prev => ({ ...prev, [appKey]: false }))
    }
  }

  const handleStopPortForward = async (app: Application) => {
    const appKey = `${app.id}-${app.cluster}-${app.namespace}`
    setPortForwardLoading(prev => ({ ...prev, [appKey]: true }))

    try {
      await clusterApi.stopPortForward(
        app.id,
        app.cluster || 'default',
        app.namespace || 'default'
      )

      setPortForwardStatus(prev => {
        const newStatus = { ...prev }
        delete newStatus[appKey]
        return newStatus
      })

      toast({
        title: 'Port Forward Stopped',
        description: `Port forwarding stopped for ${app.name}`,
      })
    } catch (err) {
      console.error('Error stopping port forward:', err)
      toast({
        title: 'Error',
        description: `Failed to stop port forwarding: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
      })
    } finally {
      setPortForwardLoading(prev => ({ ...prev, [appKey]: false }))
    }
  }

  const checkPortForwardStatus = async (app: Application) => {
    const appKey = `${app.id}-${app.cluster}-${app.namespace}`

    try {
      const result = await clusterApi.getPortForwardStatus(
        app.id,
        app.cluster || 'default',
        app.namespace || 'default'
      )

      if (result.data && result.data.status === 'active') {
        setPortForwardStatus(prev => ({ ...prev, [appKey]: result.data }))
      } else {
        setPortForwardStatus(prev => {
          const newStatus = { ...prev }
          delete newStatus[appKey]
          return newStatus
        })
      }
    } catch (err) {
      // Silently handle errors for status checks
      console.debug('Port forward status check failed:', err)
    }
  }



  // Dialog handlers
  const openDetailsDialog = (app: Application) => {
    setSelectedApp(app)
    setDetailsDialogOpen(true)
    fetchAppDetails(app)
  }

  const openLogsDialog = (app: Application) => {
    setSelectedApp(app)
    setLogsDialogOpen(true)
    fetchAppLogs(app)
  }

  const openMetricsDialog = (app: Application) => {
    setSelectedApp(app)
    setMetricsDialogOpen(true)
    fetchAppMetrics(app)
  }

  const openScaleDialog = (app: Application) => {
    setSelectedApp(app)
    setScaleReplicas(1) // Default to 1 replica
    setScaleDialogOpen(true)
  }

  // Use available clusters from cluster status API instead of deriving from apps
  // This ensures all clusters are shown, even if they don't have applications deployed

  // Debug: Show loading state and current data
  console.log('🔍 Current state:', { loading, apps: apps.length, filteredApps: filteredApps.length, error, hideSystemComponents })
  console.log('🔍 Apps data:', apps)
  console.log('🔍 Filtered apps data:', filteredApps)

  if (loading && apps.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Manage Applications</h1>
            <p className="text-muted-foreground">Loading applications...</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={async () => {
              console.log('🧪 Manual API test button clicked')
              try {
                const connected = await clusterApi.testConnection()
                console.log('🧪 Manual test result:', connected)
                alert(`API Connection: ${connected ? 'SUCCESS' : 'FAILED'}`)
              } catch (err) {
                console.error('🧪 Manual test error:', err)
                alert(`API Test Error: ${err}`)
              }
            }}>
              Test API
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Manage Applications</h1>
          <p className="text-muted-foreground">Monitor and manage your deployed applications</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshData} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="outline" onClick={async () => {
            console.log('🧪 Manual API test button clicked')
            try {
              const connected = await clusterApi.testConnection()
              console.log('🧪 Manual test result:', connected)
              alert(`API Connection: ${connected ? 'SUCCESS' : 'FAILED'}`)
            } catch (err) {
              console.error('🧪 Manual test error:', err)
              alert(`API Test Error: ${err}`)
            }
          }}>
            Test API
          </Button>
          <Button onClick={() => window.location.href = '/deploy-app'}>
            Deploy New App
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search applications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="stopped">Stopped</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={clusterFilter} onValueChange={setClusterFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Cluster" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clusters</SelectItem>
                    {availableClusters.map(cluster => (
                      <SelectItem key={cluster} value={cluster}>{cluster}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* System Components Filter */}
            <div className="flex items-center space-x-2 pt-2 border-t">
              <Checkbox
                id="hide-system-components"
                checked={hideSystemComponents}
                onCheckedChange={(checked) => setHideSystemComponents(checked === true)}
              />
              <Label
                htmlFor="hide-system-components"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <EyeOff className="h-4 w-4" />
                  Hide system components
                </div>
              </Label>
              <div className="text-xs text-muted-foreground">
                (local-path-provisioner, coredns, etc.)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications List */}
      <div className="space-y-4">
        {filteredApps.length === 0 && !loading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center text-center p-8">
                <h3 className="text-lg font-medium">No applications found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {apps.length === 0
                    ? "No applications are currently deployed. Deploy an application to get started."
                    : "No applications match your current filters. Try adjusting your search or filters."
                  }
                </p>
                {apps.length === 0 && (
                  <Button className="mt-4" onClick={() => window.location.href = '/deploy-app'}>
                    Deploy Your First App
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredApps.map((app) => (
            <Card key={app.id} className="shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold">{app.display_name || app.name}</h3>
                      <Badge variant={
                        app.status === 'Running' ? 'default' :
                        app.status === 'Stopped' ? 'secondary' :
                        app.status === 'Failed' ? 'destructive' : 'outline'
                      }>
                        {app.status || 'Unknown'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{app.description || `${app.name} application`}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Version</p>
                    <p className="text-sm font-medium">{app.version || 'latest'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cluster</p>
                    <p className="text-sm font-medium">{app.cluster || 'default'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Namespace</p>
                    <p className="text-sm font-medium">{app.namespace || 'default'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Method</p>
                    <p className="text-sm font-medium">{app.deployment_method || 'kubectl'}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {/* Access UI Button - Prominent placement for apps with access URLs */}
                  {app.access_urls && app.access_urls.length > 0 && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => window.open(app.access_urls![0].url, '_blank')}
                      className="bg-blue-600 hover:bg-blue-700 shadow-sm"
                      title={`Open ${app.access_urls[0].label}`}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Access UI
                      {app.access_urls.length > 1 && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          +{app.access_urls.length - 1}
                        </Badge>
                      )}
                    </Button>
                  )}

                  {/* Primary Actions */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAppAction(app, 'start')}
                    disabled={actionLoading === `${app.id}-start` || app.status === 'Running'}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Start
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAppAction(app, 'stop')}
                    disabled={actionLoading === `${app.id}-stop` || app.status === 'Stopped'}
                  >
                    <Square className="h-4 w-4 mr-1" />
                    Stop
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAppAction(app, 'restart')}
                    disabled={actionLoading === `${app.id}-restart`}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Restart
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openScaleDialog(app)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Scale
                  </Button>

                  {/* Port Forward Button */}
                  {(() => {
                    const appKey = `${app.id}-${app.cluster}-${app.namespace}`
                    const isPortForwardActive = portForwardStatus[appKey]?.status === 'active'
                    const isLoading = portForwardLoading[appKey]

                    return (
                      <Button
                        variant={isPortForwardActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => isPortForwardActive ? handleStopPortForward(app) : handleStartPortForward(app)}
                        disabled={isLoading || app.status !== 'Running'}
                        className={isPortForwardActive ? "bg-green-600 hover:bg-green-700" : ""}
                        title={isPortForwardActive ? `Stop port forwarding (${portForwardStatus[appKey]?.access_url})` : "Start port forwarding to access application UI"}
                      >
                        {isLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-1"></div>
                        ) : isPortForwardActive ? (
                          <Square className="h-4 w-4 mr-1" />
                        ) : (
                          <ExternalLink className="h-4 w-4 mr-1" />
                        )}
                        {isLoading ? 'Loading...' : isPortForwardActive ? 'Stop Forward' : 'Port Forward'}
                      </Button>
                    )
                  })()}

                  {/* Access Port Forward URL Button */}
                  {(() => {
                    const appKey = `${app.id}-${app.cluster}-${app.namespace}`
                    const portForwardInfo = portForwardStatus[appKey]

                    if (portForwardInfo?.status === 'active' && portForwardInfo.access_url) {
                      return (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => window.open(portForwardInfo.access_url, '_blank')}
                          className="bg-blue-600 hover:bg-blue-700"
                          title={`Open ${portForwardInfo.access_url}`}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Open UI
                        </Button>
                      )
                    }
                    return null
                  })()}
                </div>

                {/* Secondary Actions */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDetailsDialog(app)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Details
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openLogsDialog(app)}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Logs
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openMetricsDialog(app)}
                  >
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Metrics
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteApp(app)}
                    disabled={actionLoading === `${app.id}-delete` || actionLoading === `${app.id}-delete-all`}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAppWithAllResources(app)}
                    disabled={actionLoading === `${app.id}-delete` || actionLoading === `${app.id}-delete-all`}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {actionLoading === `${app.id}-delete-all` ? 'Deleting All...' : 'Delete All Resources'}
                  </Button>
                </div>

                {/* Access URLs */}
                {app.access_urls && app.access_urls.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Access URLs
                    </h4>
                    <div className="space-y-2">
                      {app.access_urls.map((url, index) => {
                        const IconComponent = getAccessUrlIcon(url.type, app.name)
                        const colorClass = getAccessUrlColor(url.type)

                        return (
                          <div key={index} className="flex justify-between items-center p-3 bg-secondary/20 rounded-md hover:bg-secondary/30 transition-colors border border-secondary/40">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="flex-shrink-0">
                                <IconComponent className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className={`text-xs ${colorClass}`}>
                                    {url.type}
                                  </Badge>
                                  <p className="text-sm font-medium truncate">{url.label}</p>
                                </div>
                                <p className="text-sm font-mono text-blue-600 hover:text-blue-800 cursor-pointer truncate"
                                   onClick={() => window.open(url.url, '_blank')}
                                   title={url.url}>
                                  {url.url}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => window.open(url.url, '_blank')}
                              className="ml-3 bg-blue-600 hover:bg-blue-700"
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Open
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Application Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details - {selectedApp?.name}</DialogTitle>
            <DialogDescription>
              Detailed information about the deployed application
            </DialogDescription>
          </DialogHeader>

          {appDetails && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="deployment">Deployment</TabsTrigger>
                <TabsTrigger value="pods">Pods</TabsTrigger>
                <TabsTrigger value="access">Access</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Application Name</Label>
                    <p className="text-sm font-medium">{selectedApp?.name}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge variant={selectedApp?.status === 'Running' ? 'default' : 'secondary'}>
                      {selectedApp?.status}
                    </Badge>
                  </div>
                  <div>
                    <Label>Cluster</Label>
                    <p className="text-sm font-medium">{selectedApp?.cluster}</p>
                  </div>
                  <div>
                    <Label>Namespace</Label>
                    <p className="text-sm font-medium">{selectedApp?.namespace}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="deployment" className="space-y-4">
                {appDetails.deployment && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Replicas</Label>
                        <p className="text-sm font-medium">{appDetails.deployment.replicas || 0}</p>
                      </div>
                      <div>
                        <Label>Ready Replicas</Label>
                        <p className="text-sm font-medium">{appDetails.deployment.ready_replicas || 0}</p>
                      </div>
                      <div>
                        <Label>Available Replicas</Label>
                        <p className="text-sm font-medium">{appDetails.deployment.available_replicas || 0}</p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="pods" className="space-y-4">
                {appDetails.pods && appDetails.pods.length > 0 ? (
                  <div className="space-y-2">
                    {appDetails.pods.map((pod, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Pod Name</Label>
                              <p className="text-sm font-medium">{pod.name}</p>
                            </div>
                            <div>
                              <Label>Phase</Label>
                              <Badge variant={pod.phase === 'Running' ? 'default' : 'secondary'}>
                                {pod.phase}
                              </Badge>
                            </div>
                            <div>
                              <Label>Ready</Label>
                              <p className="text-sm font-medium">{pod.ready ? 'Yes' : 'No'}</p>
                            </div>
                            <div>
                              <Label>Restart Count</Label>
                              <p className="text-sm font-medium">{pod.restart_count || 0}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No pods found</p>
                )}
              </TabsContent>

              <TabsContent value="access" className="space-y-4">
                {appDetails && appDetails.access_info ? (
                  <div className="space-y-6">
                    {/* Connection Information */}
                    {appDetails.access_info.connection_info && Object.keys(appDetails.access_info.connection_info).length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3">Database Connection</h4>
                        <Card>
                          <CardContent className="pt-4">
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Type</Label>
                                  <p className="text-sm font-medium">{appDetails.access_info.connection_info.type}</p>
                                </div>
                                <div>
                                  <Label>Host</Label>
                                  <p className="text-sm font-medium font-mono">{appDetails.access_info.connection_info.host}</p>
                                </div>
                                <div>
                                  <Label>Port</Label>
                                  <p className="text-sm font-medium font-mono">{appDetails.access_info.connection_info.port}</p>
                                </div>
                                <div>
                                  <Label>Database</Label>
                                  <p className="text-sm font-medium font-mono">{appDetails.access_info.connection_info.database}</p>
                                </div>
                                <div>
                                  <Label>Username</Label>
                                  <p className="text-sm font-medium font-mono">{appDetails.access_info.connection_info.username}</p>
                                </div>
                                <div>
                                  <Label>Password</Label>
                                  <p className="text-sm font-medium font-mono">{appDetails.access_info.connection_info.password}</p>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>Connection String</Label>
                                <div className="p-2 bg-secondary/20 rounded-md">
                                  <code className="text-sm">{appDetails.access_info.connection_info.connection_string}</code>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>psql Command</Label>
                                <div className="p-2 bg-secondary/20 rounded-md">
                                  <code className="text-sm">{appDetails.access_info.connection_info.psql_command}</code>
                                </div>
                              </div>

                              {appDetails.access_info.connection_info.notes && (
                                <div className="space-y-2">
                                  <Label>Notes</Label>
                                  <ul className="text-sm text-muted-foreground space-y-1">
                                    {appDetails.access_info.connection_info.notes.map((note, index) => (
                                      <li key={index} className="flex items-start gap-2">
                                        <span className="text-blue-500 mt-1">•</span>
                                        <span>{note}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Port Forward Commands */}
                    {appDetails.access_info.port_forward_commands && appDetails.access_info.port_forward_commands.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3">Port Forward Commands</h4>
                        <div className="space-y-2">
                          {appDetails.access_info.port_forward_commands.map((cmd, index) => (
                            <Card key={index}>
                              <CardContent className="pt-4">
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <Label>Service: {cmd.service}</Label>
                                      <p className="text-xs text-muted-foreground">{cmd.port_name} - {cmd.service_port} → {cmd.local_port}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-medium text-blue-600">{cmd.access_url}</p>
                                    </div>
                                  </div>
                                  <div className="p-2 bg-secondary/20 rounded-md">
                                    <code className="text-sm">{cmd.command}</code>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Services */}
                    {appDetails.services && appDetails.services.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3">Services</h4>
                        <div className="space-y-2">
                          {appDetails.services.map((service, index) => (
                            <Card key={index}>
                              <CardContent className="pt-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Service Name</Label>
                                    <p className="text-sm font-medium">{service.name}</p>
                                  </div>
                                  <div>
                                    <Label>Type</Label>
                                    <p className="text-sm font-medium">{service.type}</p>
                                  </div>
                                  <div>
                                    <Label>Cluster IP</Label>
                                    <p className="text-sm font-medium font-mono">{service.cluster_ip}</p>
                                  </div>
                                  <div>
                                    <Label>Ports</Label>
                                    <div className="text-sm font-medium">
                                      {service.ports.map((port, portIndex) => (
                                        <div key={portIndex} className="font-mono">
                                          {port.name ? `${port.name}: ` : ''}{port.port}
                                          {port.targetPort && port.targetPort !== port.port ? ` → ${port.targetPort}` : ''}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No access information available</p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Application Logs Dialog */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Application Logs - {selectedApp?.name}</DialogTitle>
            <DialogDescription>
              Recent logs from the application pods
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[60vh] w-full border rounded-md p-4">
            <pre className="text-sm font-mono whitespace-pre-wrap">{appLogs}</pre>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => selectedApp && fetchAppLogs(selectedApp)}>
              Refresh Logs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Application Metrics Dialog */}
      <Dialog open={metricsDialogOpen} onOpenChange={setMetricsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Application Metrics - {selectedApp?.name}</DialogTitle>
            <DialogDescription>
              Resource usage and performance metrics
            </DialogDescription>
          </DialogHeader>

          {appMetrics && (
            <div className="space-y-6">
              {/* Resource Requests and Limits */}
              {appMetrics.resources && (
              <div>
                <h4 className="text-sm font-medium mb-3">Resource Configuration</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">CPU:</span>
                          <span className="text-sm font-medium">{appMetrics.resources?.requests?.cpu || 'Not set'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Memory:</span>
                          <span className="text-sm font-medium">{appMetrics.resources?.requests?.memory || 'Not set'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Limits</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">CPU:</span>
                          <span className="text-sm font-medium">{appMetrics.resources?.limits?.cpu || 'Not set'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Memory:</span>
                          <span className="text-sm font-medium">{appMetrics.resources?.limits?.memory || 'Not set'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              )}

              {/* Current Usage */}
              <div>
                <h4 className="text-sm font-medium mb-3">Current Usage</h4>
                {appMetrics.metrics && appMetrics.metrics.length > 0 ? (
                  <div className="space-y-2">
                    {appMetrics.metrics.map((metric, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label>Pod</Label>
                              <p className="text-sm font-medium">{metric.pod_name}</p>
                            </div>
                            <div>
                              <Label>CPU</Label>
                              <p className="text-sm font-medium">{metric.cpu}</p>
                            </div>
                            <div>
                              <Label>Memory</Label>
                              <p className="text-sm font-medium">{metric.memory}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No metrics available. Make sure metrics-server is installed in your cluster.</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => selectedApp && fetchAppMetrics(selectedApp)}>
              Refresh Metrics
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scale Application Dialog */}
      <Dialog open={scaleDialogOpen} onOpenChange={setScaleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scale Application</DialogTitle>
            <DialogDescription>
              Adjust the number of replicas for {selectedApp?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="replicas">Number of Replicas</Label>
              <Input
                id="replicas"
                type="number"
                min="0"
                max="10"
                value={scaleReplicas}
                onChange={(e) => setScaleReplicas(parseInt(e.target.value) || 1)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Set to 0 to stop the application, or increase for high availability
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setScaleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleScaleApp}
              disabled={actionLoading === `${selectedApp?.id}-scale`}
            >
              {actionLoading === `${selectedApp?.id}-scale` ? 'Scaling...' : 'Scale Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
