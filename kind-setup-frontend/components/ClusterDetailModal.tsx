'use client'

import React, { useState, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Activity, 
  Server, 
  Database, 
  Network, 
  HardDrive, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Cpu, 
  MemoryStick,
  RefreshCw,
  X
} from 'lucide-react'
import { clusterApi, type ClusterDetails, type ClusterNode, type ClusterHealth, type ClusterResources, type ClusterNetwork, type ClusterStorage, type ClusterWorkloads, type ClusterEvents } from '@/services/clean-api'

interface ClusterDetailModalProps {
  isOpen: boolean
  onClose: () => void
  clusterName: string
}

export function ClusterDetailModal({ isOpen, onClose, clusterName }: ClusterDetailModalProps) {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  
  // State for different data sections
  const [clusterDetails, setClusterDetails] = useState<ClusterDetails | null>(null)
  const [clusterNodes, setClusterNodes] = useState<ClusterNode[]>([])
  const [clusterHealth, setClusterHealth] = useState<ClusterHealth | null>(null)
  const [clusterResources, setClusterResources] = useState<ClusterResources | null>(null)
  const [clusterNetwork, setClusterNetwork] = useState<ClusterNetwork | null>(null)
  const [clusterStorage, setClusterStorage] = useState<ClusterStorage | null>(null)
  const [clusterWorkloads, setClusterWorkloads] = useState<ClusterWorkloads | null>(null)
  const [clusterEvents, setClusterEvents] = useState<ClusterEvents | null>(null)

  const fetchClusterData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      // Fetch all cluster data in parallel
      const [
        detailsResponse,
        nodesResponse,
        healthResponse,
        resourcesResponse,
        networkResponse,
        storageResponse,
        workloadsResponse,
        eventsResponse
      ] = await Promise.allSettled([
        clusterApi.getClusterDetails(clusterName),
        clusterApi.getClusterNodes(clusterName),
        clusterApi.getClusterHealthDetailed(clusterName),
        clusterApi.getClusterResources(clusterName),
        clusterApi.getClusterNetwork(clusterName),
        clusterApi.getClusterStorage(clusterName),
        clusterApi.getClusterWorkloads(clusterName),
        clusterApi.getClusterEvents(clusterName, 50)
      ])

      // Process responses
      if (detailsResponse.status === 'fulfilled') {
        setClusterDetails(detailsResponse.value.data)
      }
      if (nodesResponse.status === 'fulfilled') {
        setClusterNodes(nodesResponse.value.data.nodes || [])
      }
      if (healthResponse.status === 'fulfilled') {
        setClusterHealth(healthResponse.value.data)
      }
      if (resourcesResponse.status === 'fulfilled') {
        setClusterResources(resourcesResponse.value.data)
      }
      if (networkResponse.status === 'fulfilled') {
        setClusterNetwork(networkResponse.value.data)
      }
      if (storageResponse.status === 'fulfilled') {
        setClusterStorage(storageResponse.value.data)
      }
      if (workloadsResponse.status === 'fulfilled') {
        setClusterWorkloads(workloadsResponse.value.data)
      }
      if (eventsResponse.status === 'fulfilled') {
        setClusterEvents(eventsResponse.value.data)
      }

    } catch (error) {
      console.error('Error fetching cluster data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (isOpen && clusterName) {
      fetchClusterData()
    }
  }, [isOpen, clusterName])

  const handleRefresh = () => {
    fetchClusterData(true)
  }

  const getHealthBadgeVariant = (health: string) => {
    switch (health.toLowerCase()) {
      case 'healthy':
        return 'default'
      case 'degraded':
        return 'secondary'
      case 'unhealthy':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
      case 'ready':
      case 'active':
      case 'bound':
        return 'default'
      case 'pending':
      case 'creating':
        return 'secondary'
      case 'failed':
      case 'error':
      case 'notready':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Cluster Details: {clusterName}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span>Loading cluster information...</span>
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="nodes">Nodes</TabsTrigger>
              <TabsTrigger value="workloads">Workloads</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="network">Network</TabsTrigger>
              <TabsTrigger value="storage">Storage</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(90vh-200px)] mt-4">
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Cluster Status Card */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Cluster Status</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Status:</span>
                          <Badge variant={getStatusBadgeVariant(clusterDetails?.status || 'Unknown')}>
                            {clusterDetails?.status || 'Unknown'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Health:</span>
                          <Badge variant={getHealthBadgeVariant(clusterHealth?.overall_health || 'Unknown')}>
                            {clusterHealth?.overall_health || 'Unknown'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Nodes:</span>
                          <span className="text-sm font-medium">{clusterNodes?.length || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Version Information */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Version Info</CardTitle>
                      <Server className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Client:</span>
                          <span className="text-sm font-medium">
                            {clusterDetails?.version?.client_version || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Server:</span>
                          <span className="text-sm font-medium">
                            {clusterDetails?.version?.server_version || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Created:</span>
                          <span className="text-sm font-medium">
                            {clusterDetails?.created ? new Date(clusterDetails.created).toLocaleDateString() : 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Resource Summary */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Resources</CardTitle>
                      <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Namespaces:</span>
                          <span className="text-sm font-medium">
                            {clusterResources?.summary?.total_namespaces || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Pods:</span>
                          <span className="text-sm font-medium">
                            {clusterWorkloads?.summary?.total_pods || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Services:</span>
                          <span className="text-sm font-medium">
                            {clusterNetwork?.summary?.total_services || 0}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="nodes" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      Cluster Nodes
                    </CardTitle>
                    <CardDescription>
                      Detailed information about cluster nodes and their status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {clusterNodes && clusterNodes.length > 0 ? clusterNodes.map((node, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Server className="h-5 w-5" />
                                <h3 className="font-semibold">{node.name}</h3>
                              </div>
                              <Badge variant={node.role === 'control-plane' ? 'default' : 'secondary'}>
                                {node.role}
                              </Badge>
                              <Badge variant={getStatusBadgeVariant(node.status)}>
                                {node.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              {node.age}
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No nodes found in this cluster
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Other tabs will be added later */}
              <TabsContent value="workloads">
                <div className="text-center py-8 text-muted-foreground">
                  Workloads information will be displayed here
                </div>
              </TabsContent>
              
              <TabsContent value="resources">
                <div className="text-center py-8 text-muted-foreground">
                  Resources information will be displayed here
                </div>
              </TabsContent>
              
              <TabsContent value="network">
                <div className="text-center py-8 text-muted-foreground">
                  Network information will be displayed here
                </div>
              </TabsContent>
              
              <TabsContent value="storage">
                <div className="text-center py-8 text-muted-foreground">
                  Storage information will be displayed here
                </div>
              </TabsContent>
              
              <TabsContent value="events">
                <div className="text-center py-8 text-muted-foreground">
                  Events information will be displayed here
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
