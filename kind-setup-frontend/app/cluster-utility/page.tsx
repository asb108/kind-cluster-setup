'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/ui/dashboard-layout';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, RefreshCw, Home, Trash2 } from 'lucide-react';

export default function ClusterUtility() {
  const [clusters, setClusters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchClusters = async () => {
    setRefreshing(true);
    try {
      // Direct API call to get clusters
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8020'}/api/cluster/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Cluster data:', data);

      // Extract clusters from the response
      const clustersList = data?.data?.clusters || [];
      setClusters(clustersList);
      
      toast({
        title: "Clusters Refreshed",
        description: `Found ${clustersList.length} clusters`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error fetching clusters:', error);
      toast({
        title: "Error",
        description: "Failed to fetch clusters. Check the console for details.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Direct API call to delete cluster
  const deleteCluster = async (clusterName: string) => {
    if (!confirm(`Are you sure you want to delete the cluster '${clusterName}'?`)) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8020'}/api/cluster/delete?name=${clusterName}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: "Cluster Deleted",
        description: `Cluster '${clusterName}' has been deleted.`,
        duration: 3000,
      });

      // Refresh the cluster list
      fetchClusters();
    } catch (error) {
      console.error(`Error deleting cluster '${clusterName}':`, error);
      toast({
        title: "Error",
        description: `Failed to delete cluster '${clusterName}'. Check the console for details.`,
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // Fetch clusters when the component mounts
  useEffect(() => {
    fetchClusters();
  }, []);

  return (
    <DashboardLayout
      title="Cluster Utility"
      description="Direct access to cluster management functions"
    >
      <div className="mb-6 flex items-center justify-between">
        <Link href="/">
          <Button variant="outline" size="sm">
            <Home className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
        </Link>
        <Button 
          onClick={fetchClusters} 
          disabled={refreshing}
          variant="secondary"
          size="sm"
        >
          {refreshing ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Refreshing...</>
          ) : (
            <><RefreshCw className="h-4 w-4 mr-2" /> Refresh Clusters</>
          )}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading clusters...</span>
        </div>
      ) : clusters.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p>No clusters found. Create a new cluster from the dashboard.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {clusters.map((cluster) => (
            <Card key={cluster.name} className="overflow-hidden">
              <CardHeader className="bg-muted/50">
                <CardTitle className="flex items-center justify-between">
                  <span>{cluster.name}</span>
                  <Button
                    onClick={() => deleteCluster(cluster.name)}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold mb-1">Status</p>
                    <p>{cluster.status}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1">Nodes</p>
                    <p>{cluster.nodes}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1">Created</p>
                    <p>{new Date(cluster.created).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
