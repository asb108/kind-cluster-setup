'use client';

import { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

export default function ApiTest() {
  const { toast } = useToast();
  const [clusterName, setClusterName] = useState('test');
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8020';

  const testSimpleDelete = async () => {
    setResponse(null);
    setError(null);
    
    try {
      toast({
        title: 'Sending Test Delete',
        description: `Testing deletion for ${clusterName}`,
        duration: 3000,
      });
      
      // Use direct axios instead of the API client
      const result = await axios.delete(`${apiBaseUrl}/api/test-delete/${clusterName}`);
      
      setResponse(result.data);
      toast({
        title: 'Test Delete Successful',
        description: 'The test delete endpoint responded successfully',
        duration: 3000,
      });
    } catch (err: any) {
      console.error('Error in test delete:', err);
      setError(err.message || 'Unknown error');
      toast({
        title: 'Test Delete Failed',
        description: `Error: ${err.message || 'Unknown error'}`,
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  const testRealDelete = async () => {
    setResponse(null);
    setError(null);
    
    try {
      toast({
        title: 'Sending Real Delete',
        description: `Testing real deletion for ${clusterName}`,
        duration: 3000,
      });
      
      // Use direct axios instead of the API client
      const result = await axios.delete(`${apiBaseUrl}/api/cluster/delete/${clusterName}`);
      
      setResponse(result.data);
      toast({
        title: 'Real Delete Successful',
        description: 'The real delete endpoint responded successfully',
        duration: 3000,
      });
    } catch (err: any) {
      console.error('Error in real delete:', err);
      setError(err.message || 'Unknown error');
      toast({
        title: 'Real Delete Failed',
        description: `Error: ${err.message || 'Unknown error'}`,
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  const testOtherDelete = async () => {
    setResponse(null);
    setError(null);
    
    try {
      toast({
        title: 'Sending Other Delete',
        description: `Testing deletion via /api/cluster/${clusterName}`,
        duration: 3000,
      });
      
      // Try the other delete endpoint
      const result = await axios.delete(`${apiBaseUrl}/api/cluster/${clusterName}`);
      
      setResponse(result.data);
      toast({
        title: 'Other Delete Successful',
        description: 'The other delete endpoint responded successfully',
        duration: 3000,
      });
    } catch (err: any) {
      console.error('Error in other delete:', err);
      setError(err.message || 'Unknown error');
      toast({
        title: 'Other Delete Failed',
        description: `Error: ${err.message || 'Unknown error'}`,
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">API Endpoint Test Page</h1>
      <p className="text-muted-foreground mb-6">Use this page to diagnose cluster deletion issues</p>
      
      <div className="bg-card border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Cluster Delete Test</h2>
        
        <div className="flex gap-2 mb-4">
          <Input 
            type="text" 
            placeholder="Cluster Name" 
            value={clusterName} 
            onChange={(e) => setClusterName(e.target.value)} 
            className="max-w-xs" 
          />
          
          <Button onClick={testSimpleDelete} variant="default" className="bg-blue-500 hover:bg-blue-600">
            Test Simple Delete
          </Button>
          
          <Button onClick={testRealDelete} variant="default" className="bg-purple-500 hover:bg-purple-600">
            Test Real Delete
          </Button>
          
          <Button onClick={testOtherDelete} variant="default" className="bg-green-500 hover:bg-green-600">
            Test Other Delete
          </Button>
        </div>
        
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">API Base URL:</h3>
          <pre className="bg-muted p-2 rounded">{apiBaseUrl}</pre>
        </div>
      </div>
      
      {response && (
        <div className="bg-card border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-green-600">Success Response</h2>
          <pre className="bg-muted p-4 rounded overflow-auto max-h-60">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
      
      {error && (
        <div className="bg-card border border-red-300 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-red-600">Error</h2>
          <pre className="bg-red-50 p-4 rounded overflow-auto max-h-60 text-red-800">
            {error}
          </pre>
        </div>
      )}
    </div>
  );
}
