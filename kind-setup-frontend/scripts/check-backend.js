// Simple script to check if the backend server is running
const fetch = require('node-fetch');

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8020';

async function checkBackendStatus() {
  console.log(`Checking backend server at ${API_BASE_URL}...`);
  
  try {
    // Try the health endpoint
    const healthResponse = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    
    if (healthResponse.ok) {
      const data = await healthResponse.json();
      console.log('✅ Backend server is online!');
      console.log('Health check response:', data);
      
      // Check if mock data is being used
      if (data.data && data.data.mock_data) {
        console.log('⚠️ WARNING: Backend is configured to use mock data!');
        console.log('To use real data, restart the backend without the --mock flag');
      }
      
      // Now try the cluster status endpoint
      try {
        const statusResponse = await fetch(`${API_BASE_URL}/api/cluster/status`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        });
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log('✅ Cluster status endpoint is working!');
          console.log('Clusters found:', statusData.data?.clusters?.length || 0);
          
          if (statusData.data?.clusters?.length > 0) {
            console.log('Cluster names:', statusData.data.clusters.map(c => c.name).join(', '));
          } else {
            console.log('⚠️ No clusters found. Make sure you have Kind clusters running.');
          }
        } else {
          console.log('❌ Cluster status endpoint returned error:', statusResponse.status);
        }
      } catch (statusError) {
        console.log('❌ Error accessing cluster status endpoint:', statusError.message);
      }
    } else {
      console.log('❌ Backend server health check failed with status:', healthResponse.status);
    }
  } catch (error) {
    console.log('❌ Backend server is not accessible:', error.message);
    console.log('\nPossible solutions:');
    console.log('1. Make sure the backend server is running');
    console.log('2. Check if the server is running on the correct port (default: 8020)');
    console.log('3. Verify there are no firewall or network issues');
    console.log('4. If using a custom API URL, ensure it is correct');
  }
}

checkBackendStatus().catch(console.error);
