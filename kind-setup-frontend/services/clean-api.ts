import axios from 'axios';
import { checkClusterExists as robustCheckClusterExists } from '@/services/cluster-status-checker';

// Type definitions to match the frontend
interface AppContainer {
  name: string;
  image: string;
  ready: boolean;
  state: string;
}

interface AppPod {
  name: string;
  phase: string;
  ready: boolean;
  containers: AppContainer[];
}

interface AppPort {
  name: string;
  port: number;
  target_port: number;
  node_port?: number;
}

interface AppService {
  name: string;
  type: string;
  cluster_ip: string;
  external_ip: string;
  ports: AppPort[];
}

interface AppIngress {
  name: string;
  hosts: string[];
}

interface AppAccessUrl {
  type: string;
  url: string;
}

interface AppSpecificInfo {
  admin_user?: string;
  admin_password?: string;
  [key: string]: any;
}

interface DeploymentStatus {
  app: string;
  namespace: string;
  pods: AppPod[];
  services: AppService[];
  ingresses: AppIngress[];
  access_urls: AppAccessUrl[];
  app_info: AppSpecificInfo;
}

// Define interfaces for cluster monitoring data
export interface ClusterDetails {
  name: string;
  status: string;
  version: {
    client_version: string;
    server_version: string;
  };
  cluster_info: string;
  created: string;
  context: string;
}

export interface ClusterNode {
  name: string;
  role: string;
  status: string;
  ready: boolean;
  age: string;
  version: string;
  os?: string;
  kernel?: string;
  container_runtime?: string;
  cpu_usage?: string;
  memory_usage?: string;
  conditions?: any[];
  labels?: Record<string, string>;
}

export interface ClusterHealth {
  cluster_name: string;
  overall_health: string;
  components: Array<{
    name: string;
    healthy: boolean;
    status: string;
    conditions?: any[];
  }>;
  system_pods: Array<{
    name: string;
    namespace: string;
    status: string;
    ready: string;
    age: string;
    node: string;
  }>;
  summary: {
    total_components: number;
    healthy_components: number;
    total_system_pods: number;
    healthy_system_pods: number;
  };
}

export interface NamespaceResources {
  name: string;
  pod_count: number;
  running_pods: number;
  service_count: number;
  deployment_count: number;
  status: string;
}

export interface ClusterResources {
  cluster_name: string;
  namespaces: NamespaceResources[];
  summary: {
    total_namespaces: number;
    total_pods: number;
    total_services: number;
    total_deployments: number;
  };
}

export interface ClusterNetwork {
  cluster_name: string;
  services: Array<{
    name: string;
    namespace: string;
    type: string;
    cluster_ip: string;
    external_ip?: string[];
    ports: Array<{
      name?: string;
      port: number;
      target_port: number;
    }>;
  }>;
  ingresses: Array<{
    name: string;
    namespace: string;
    hosts: string[];
    paths: string[];
  }>;
  summary: {
    total_services: number;
    total_ingresses: number;
    cluster_ip_services: number;
    nodeport_services: number;
    loadbalancer_services: number;
  };
}

export interface ClusterStorage {
  cluster_name: string;
  storage_classes: Array<{
    name: string;
    provisioner: string;
    reclaim_policy: string;
    volume_binding_mode: string;
    default: boolean;
  }>;
  persistent_volumes: Array<{
    name: string;
    capacity: string;
    access_modes: string[];
    reclaim_policy: string;
    status: string;
    claim: string;
    storage_class: string;
  }>;
  persistent_volume_claims: Array<{
    name: string;
    namespace: string;
    status: string;
    volume: string;
    capacity: string;
    access_modes: string[];
    storage_class: string;
  }>;
  summary: {
    total_storage_classes: number;
    total_persistent_volumes: number;
    total_persistent_volume_claims: number;
    bound_pvs: number;
    bound_pvcs: number;
  };
}

export interface ClusterWorkloads {
  cluster_name: string;
  pods: Array<{
    name: string;
    namespace: string;
    status: string;
    ready: string;
    age: string;
    node: string;
    containers: string[];
  }>;
  deployments: Array<{
    name: string;
    namespace: string;
    replicas: number;
    ready_replicas: number;
    available_replicas: number;
    updated_replicas: number;
    strategy: string;
    age: string;
  }>;
  namespace_workloads: Record<string, {
    pods: any[];
    running_pods: number;
    failed_pods: number;
  }>;
  summary: {
    total_pods: number;
    running_pods: number;
    failed_pods: number;
    total_deployments: number;
    ready_deployments: number;
  };
}

export interface ClusterEvents {
  cluster_name: string;
  events: Array<{
    namespace: string;
    name: string;
    type: string;
    reason: string;
    message: string;
    source: string;
    object: {
      kind: string;
      name: string;
      namespace?: string;
    };
    first_timestamp?: string;
    last_timestamp?: string;
    count: number;
    age: string;
  }>;
  summary: {
    total_events: number;
    warning_events: number;
    normal_events: number;
    recent_warnings: any[];
  };
}

// Define interfaces for our API types
export interface Application {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  icon?: string;
  status?: string;
  version?: string;
  cluster?: string;
  namespace?: string;
  deployment_method?: string;
  deployment_status?: DeploymentStatus;
}

export interface ClusterNode {
  name: string;
  role: string;
  status: string;
  cpu: number;
  memory: number;
  disk: number;
  version: string;
}

export interface Cluster {
  name: string;
  status: string;
  nodes: number;
  created: string;
}

export interface ClusterStatus {
  cluster_count: number;
  node_count: number;
  cpu_usage: number;
  clusters: Cluster[];
}

// Configure API base URL with environment variable and fallback
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8020';
console.log('Using API base URL:', API_BASE_URL);

// Helper function for sleep/delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Create Axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Accept': 'application/json'
  },
  timeout: 60000, // 1 minute timeout for regular operations (reduced from 2 minutes)
  withCredentials: false, // Must match backend CORS setting (both false)
  timeoutErrorMessage: 'Request timed out - the operation is taking longer than expected',
  validateStatus: (status) => status >= 200 && status < 500
});

// Create a special Axios instance for cluster operations with longer timeout
const clusterApi_axios = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Accept': 'application/json'
  },
  timeout: 180000, // 3 minutes timeout for cluster operations (reduced from 5 minutes)
  withCredentials: false,
  timeoutErrorMessage: 'Cluster operation timed out - this may take several minutes',
  validateStatus: (status) => status >= 200 && status < 500
});

// Add request debug interceptor
api.interceptors.request.use(config => {
  console.log(`🔄 Sending ${config.method?.toUpperCase()} request to: ${config.baseURL}${config.url}`);
  return config;
});

// Add response debug interceptor with improved timeout handling
api.interceptors.response.use(
  response => {
    console.log(`✅ Response from ${response.config.url}: Status ${response.status}`);
    return response;
  },
  error => {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error(`⏰ Request timeout: ${error.config?.url} - Consider checking backend server status`);
      // For task polling timeouts, return a special error that can be handled gracefully
      if (error.config?.url?.includes('/api/tasks/')) {
        const taskTimeoutError = new Error('Task polling timeout - please check if the operation completed successfully');
        taskTimeoutError.name = 'TaskPollingTimeout';
        // Add additional properties to help with error detection
        (taskTimeoutError as any).isTaskTimeout = true;
        (taskTimeoutError as any).originalError = error;
        return Promise.reject(taskTimeoutError);
      }
    } else if (error.response) {
      console.error(`❌ Error response from API: ${error.response.status} - ${error.response.data?.message || error.message}`);
    } else if (error.request) {
      console.error(`❌ No response received from API: ${error.message} - Backend may be unavailable`);
    } else {
      console.error(`❌ Error setting up request: ${error.message}`);
    }
    return Promise.reject(error);
  }
);

// Add interceptors to cluster API instance as well
clusterApi_axios.interceptors.request.use(config => {
  console.log(`🔄 [CLUSTER] Sending ${config.method?.toUpperCase()} request to: ${config.baseURL}${config.url}`);
  return config;
});

clusterApi_axios.interceptors.response.use(
  response => {
    console.log(`✅ [CLUSTER] Response from ${response.config.url}: Status ${response.status}`);
    return response;
  },
  error => {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error(`⏰ [CLUSTER] Request timeout: ${error.config?.url} - Cluster operations may take longer`);
    } else if (error.response) {
      console.error(`❌ [CLUSTER] Error response from API: ${error.response.status} - ${error.response.data?.message || error.message}`);
    } else if (error.request) {
      console.error(`❌ [CLUSTER] No response received from API: ${error.message} - Backend may be unavailable`);
    } else {
      console.error(`❌ [CLUSTER] Error setting up request: ${error.message}`);
    }
    return Promise.reject(error);
  }
);

// Utility to check if the server is online
const isServerOnline = async (): Promise<boolean> => {
  try {
    // First try a simple fetch with a reasonable timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      try {
        controller.abort(new DOMException('Timeout exceeded', 'TimeoutError'));
      } catch (e) {
        console.warn('Error aborting controller:', e);
      }
    }, 10000); // 10 second timeout for health check (increased from 5s)

    console.log(`🔍 [isServerOnline] Checking if backend server is online at ${API_BASE_URL}/health...`);

    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // Don't use credentials for the health check
      credentials: 'omit',
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    console.log(`🔍 [isServerOnline] Health check response status: ${response.status}`);

    if (response.ok) {
      // Try to parse the response to check if mock data is being used
      try {
        const data = await response.json();
        console.log('🔍 [isServerOnline] HEALTH CHECK RESPONSE:', JSON.stringify(data, null, 2));

        if (data.data && data.data.mock_data === true) {
          console.log('⚠️ [isServerOnline] Backend server is online but using MOCK DATA');
          console.log('To use real data, restart the backend without the --mock flag');
        } else {
          console.log('✅ [isServerOnline] Backend server is online and using REAL DATA');
        }
      } catch (parseError) {
        console.log('✅ [isServerOnline] Backend server is online (could not parse response)');
        console.log('Parse error:', parseError instanceof Error ? parseError.message : 'Unknown error');
      }

      // Try a direct call to the cluster status endpoint to verify it works
      try {
        console.log(`🔍 Testing cluster status endpoint at ${API_BASE_URL}/api/cluster/status...`);
        const statusResponse = await fetch(`${API_BASE_URL}/api/cluster/status`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'omit'
        });

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log('CLUSTER STATUS TEST RESPONSE:', JSON.stringify(statusData, null, 2));
          console.log('✅ Cluster status endpoint is working!');

          // Force return true if we can get real cluster data
          if (statusData.data && statusData.data.clusters && statusData.data.clusters.length > 0) {
            console.log('✅ Found real clusters in API response, server is definitely online');
            return true;
          }
        } else {
          console.log(`⚠️ Cluster status endpoint returned status ${statusResponse.status}`);
        }
      } catch (statusError) {
        console.log('⚠️ Error testing cluster status endpoint:',
          statusError instanceof Error ? statusError.message : 'Unknown error');
      }

      console.log('✅ [isServerOnline] Health check successful, returning true');
      return true;
    } else {
      console.log(`⚠️ [isServerOnline] Backend server returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`⚠️ [isServerOnline] Server health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.log(`⚠️ [isServerOnline] Error details:`, error);

    // If the first attempt failed, try one more time with a different endpoint
    try {
      console.log(`🔍 [isServerOnline] Trying alternative endpoint ${API_BASE_URL}/api/cluster/status...`);

      const response = await fetch(`${API_BASE_URL}/api/cluster/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit'
      });

      if (response.ok) {
        console.log('✅ Backend server is online (second attempt succeeded)');
        const data = await response.json();
        console.log('SECOND ATTEMPT RESPONSE:', JSON.stringify(data, null, 2));

        // Force return true if we can get real cluster data
        if (data.data && data.data.clusters && data.data.clusters.length > 0) {
          console.log('✅ Found real clusters in API response, server is definitely online');
          return true;
        }

        return true;
      } else {
        console.log(`⚠️ Second attempt failed with status ${response.status}`);
      }
    } catch (secondError) {
      console.log('❌ Second server health check also failed:',
        secondError instanceof Error ? secondError.message : 'Unknown error');
    }

    // Log helpful debugging information
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Make sure the backend server is running');
    console.log(`2. Check if the server is running on the correct port (${API_BASE_URL})`);
    console.log('3. Verify there are no firewall or network issues');
    console.log('4. If using a custom API URL, ensure it is correct');
    console.log('5. Run the check-backend.js script for more detailed diagnostics\n');

    return false;
  }
};

// Helper function to get icon URL for an app
const getIconForApp = (appName: string): string => {
  switch (appName.toLowerCase()) {
    case 'airflow':
      return 'https://airflow.apache.org/docs/apache-airflow/stable/_images/pin_large.png';
    case 'mysql':
      return 'https://www.mysql.com/common/logos/logo-mysql-170x115.png';
    case 'nginx':
      return 'https://www.nginx.com/wp-content/uploads/2018/08/NGINX-logo-rgb-large.png';
    case 'prometheus':
      return 'https://prometheus.io/assets/prometheus_logo_orange_circle.svg';
    default:
      return 'https://cdn.jsdelivr.net/gh/kubernetes/kubernetes@master/logo/logo.png';
  }
};

// Log the API URL being used (helpful for debugging)
console.log('⚠️ API Base URL:', API_BASE_URL);

// Mock data for when the backend is not available
const mockApplications = [
  {
    id: 'app-1',
    name: 'airflow',
    display_name: 'Apache Airflow',
    description: 'Workflow management platform',
    icon: 'https://airflow.apache.org/docs/apache-airflow/stable/_images/pin_large.png',
    status: 'Running',
    version: '2.6.0',
    cluster: 'test-1',
    namespace: 'airflow',
    deployment_method: 'kubectl',
    deployment_status: {
      app: 'airflow',
      namespace: 'airflow',
      pods: [
        {
          name: 'airflow-webserver-76f5b794db-t8dlx',
          phase: 'Running',
          ready: true,
          containers: [
            {
              name: 'airflow-webserver',
              image: 'apache/airflow:2.6.0',
              ready: true,
              state: 'running'
            }
          ]
        }
      ],
      services: [
        {
          name: 'airflow-webserver',
          type: 'ClusterIP',
          cluster_ip: '10.96.0.1',
          external_ip: '',
          ports: [
            {
              name: 'http',
              port: 8080,
              target_port: 8080
            }
          ]
        }
      ],
      ingresses: [
        {
          name: 'airflow-ingress',
          hosts: ['airflow.local']
        }
      ],
      access_urls: [
        {
          type: 'web',
          url: 'http://airflow.local'
        }
      ],
      app_info: {
        admin_user: 'admin',
        admin_password: 'admin',
        database: {
          type: 'postgres',
          host: 'airflow-postgres',
          port: 5432,
          database: 'airflow',
          username: 'airflow',
          password: 'airflow'
        }
      }
    }
  },
  {
    id: 'app-2',
    name: 'mysql',
    display_name: 'MySQL Database',
    description: 'Open-source relational database',
    icon: 'https://www.mysql.com/common/logos/logo-mysql-170x115.png',
    status: 'Running',
    version: '8.0',
    cluster: 'test-1',
    namespace: 'default',
    deployment_method: 'helm',
    deployment_status: {
      app: 'mysql',
      namespace: 'default',
      pods: [
        {
          name: 'mysql-0',
          phase: 'Running',
          ready: true,
          containers: [
            {
              name: 'mysql',
              image: 'mysql:8.0',
              ready: true,
              state: 'running'
            }
          ]
        }
      ],
      services: [
        {
          name: 'mysql',
          type: 'ClusterIP',
          cluster_ip: '10.96.0.2',
          external_ip: '',
          ports: [
            {
              name: 'mysql',
              port: 3306,
              target_port: 3306
            }
          ]
        }
      ],
      ingresses: [],
      access_urls: [],
      app_info: {
        root_password: 'password',
        database: 'mydatabase'
      }
    }
  }
];

const mockClusterStatus = {
  cluster_count: 1,
  node_count: 2,
  cpu_usage: 45,
  clusters: [
    {
      name: 'test-1',
      status: 'Running',
      nodes: 2,
      created: '2023-01-01T00:00:00Z'
    }
  ]
};

// Ensure we log the mock data when it's used
console.log('Mock cluster status:', mockClusterStatus);

// Define the API service with all the methods
export const clusterApi = {
  // Deploy an application
  deployApplication: async (cluster: string, name: string, namespace?: string, values?: any, method?: string, version?: string) => {
    try {
      const online = await isServerOnline();

      if (!online) {
        console.log('Backend server is not available, returning mock success response');
        return { success: true, message: 'Application deployed successfully (mock)' };
      }

      // Construct the deployment parameters object
      const deploymentParams = {
        cluster,
        name,
        namespace: namespace || 'default',
        values: values || {},
        method: method || 'kubectl',
        version: version || 'latest'
      };

      console.log('✅ Deploying application with params:', deploymentParams);

      const response = await api.post('/api/apps/deploy', deploymentParams);

      if (response.status >= 200 && response.status < 300) {
        // Successfully deployed
        console.log('Application deployed successfully:', response.data);
        return response.data;
      } else {
        console.error('Failed to deploy application:', response.data);
        throw new Error(`Failed to deploy application: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error: unknown) {
      console.error('Error deploying application:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  },

  // Stop an application
  stopApplication: async (appId: string) => {
    try {
      const online = await isServerOnline();

      if (!online) {
        console.log('Backend server is not available, returning mock success response');
        return { success: true, message: `Application ${appId} stopped successfully (mock)` };
      }

      console.log(`Attempting to stop application with ID: ${appId}`);

      const response = await api.post(`/api/apps/${appId}/stop`);

      if (response.status >= 200 && response.status < 300) {
        console.log(`Application ${appId} stopped successfully`);
        return response.data;
      } else {
        throw new Error(`Failed to stop application: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error: unknown) {
      console.error(`Error stopping application ${appId}:`, error instanceof Error ? error.message : 'Unknown error');
      throw error; // Re-throw error to be handled by caller
    }
  },

  // Delete an application
  deleteApplication: async (appId: string, appName?: string, clusterName?: string) => {
    try {
      const online = await isServerOnline();

      if (!online) {
        console.log('Backend server is not available, returning mock success response');
        // Dispatch event to notify other components that an app was deleted (mock)
        window.dispatchEvent(new CustomEvent('app-deleted', {
          detail: { success: true, appId, appName, clusterName }
        }));
        return { success: true, message: `Application ${appName || appId} deleted successfully (mock)` };
      }

      // Ensure we have valid values for logging and display
      const displayAppId = appId || 'unknown';
      const displayAppName = appName || 'unknown';

      console.log(`Deleting application: ${displayAppName} (${displayAppId}) from cluster: ${clusterName || 'unknown'}`);

      // API path can use the ID or name/cluster combination
      let apiPath = `/api/apps/${appId}`;
      if (!appId && appName && clusterName) {
        apiPath = `/api/apps?name=${encodeURIComponent(appName)}&cluster=${encodeURIComponent(clusterName)}`;
      }

      const response = await api.delete(apiPath);

      if (response.status >= 200 && response.status < 300) {
        console.log(`Application ${displayAppName} deleted successfully:`, response.data);

        // Dispatch event to notify other components that an app was deleted
        window.dispatchEvent(new CustomEvent('app-deleted', {
          detail: { success: true, appId, appName, clusterName }
        }));

        return response.data;
      } else {
        console.error(`Failed to delete application ${displayAppName}:`, response.data);
        throw new Error(`Failed to delete application: ${response.data.message || 'Unknown error'}`);
      }

    } catch (error: unknown) {
      console.error(`Error deleting application ${appName || appId || 'unknown'}:`, error instanceof Error ? error.message : 'Unknown error');

      // For UX, handle other errors gracefully
      window.dispatchEvent(new CustomEvent('app-deleted', { detail: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }}));
      throw error;
    }
  },

  getClusterStatus: async () => {
    try {
      console.log('🔍 [getClusterStatus] Starting cluster status fetch...');
      console.log('🔍 [getClusterStatus] Checking if backend server is online...');
      const online = await isServerOnline();
      console.log(`🔍 [getClusterStatus] isServerOnline result: ${online}`);

      if (!online) {
        console.log('❌ [getClusterStatus] Backend server is not available, returning empty status (no mock data)');
        return {
          cluster_count: 0,
          node_count: 0,
          cpu_usage: 0,
          clusters: []
        };
      }

      console.log('✅ Backend server is online, fetching real cluster status...');

      // Direct fetch approach for more reliable results
      try {
        console.log(`Making direct fetch to ${API_BASE_URL}/api/cluster/status`);
        const directResponse = await fetch(`${API_BASE_URL}/api/cluster/status?_=${Date.now()}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (directResponse.ok) {
          const directData = await directResponse.json();
          console.log('DIRECT FETCH RESPONSE:', JSON.stringify(directData, null, 2));

          // Ensure consistent data format
          const formattedData = {
            cluster_count: directData.data?.cluster_count || 0,
            node_count: directData.data?.node_count || 0,
            cpu_usage: directData.data?.cpu_usage || 0,
            clusters: directData.data?.clusters || []
          };

          console.log('FORMATTED CLUSTER STATUS (DIRECT):', JSON.stringify(formattedData, null, 2));

          // ALWAYS return real data, even if clusters array is empty
          // This ensures we don't fall back to mock data when the backend is working
          console.log('✅ Returning REAL cluster data with', formattedData.clusters.length, 'clusters');
          return formattedData;
        } else {
          console.log('❌ Direct fetch failed with status:', directResponse.status);
          // Try to read the error response
          try {
            const errorText = await directResponse.text();
            console.log('Error response:', errorText);
          } catch (e) {
            console.log('Could not read error response');
          }
        }
      } catch (directError) {
        console.error('❌ Error with direct fetch:', directError instanceof Error ? directError.message : 'Unknown error');
      }

      // Fallback to axios approach
      try {
        console.log('Trying axios approach as fallback');
        const response = await api.get('/api/cluster/status', {
          params: {
            _: Date.now() // Add cache busting parameter
          }
        });

        // Debug: Log the raw response data
        console.log('RAW API RESPONSE (AXIOS):', JSON.stringify(response.data, null, 2));

        if (response.data) {
          console.log('✅ Successfully fetched cluster status from API');
          // Ensure consistent data format
          const formattedData = {
            cluster_count: response.data.data?.cluster_count || response.data.cluster_count || 0,
            node_count: response.data.data?.node_count || response.data.node_count || 0,
            cpu_usage: response.data.data?.cpu_usage || response.data.cpu_usage || 0,
            clusters: response.data.data?.clusters || response.data.clusters || []
          };
          console.log('FORMATTED CLUSTER STATUS (AXIOS):', JSON.stringify(formattedData, null, 2));

          // ALWAYS return real data from the backend
          console.log('✅ Returning REAL cluster data with', formattedData.clusters.length, 'clusters');
          return formattedData;
        }
      } catch (apiError) {
        console.error('❌ Error fetching cluster status from API:', apiError instanceof Error ? apiError.message : 'Unknown error');
        console.error('Stack trace:', apiError instanceof Error ? apiError.stack : 'No stack trace available');
      }

      // Only fall back to mock data if all API calls fail
      console.log('⚠️ All API calls failed, falling back to mock data');
      return mockClusterStatus;
    } catch (error: unknown) {
      console.error('Error in getClusterStatus:', error instanceof Error ? error.message : 'Unknown error');
      // Return mock data on error for better UX
      console.log('Returning mock data due to error');
      return mockClusterStatus;
    }
  },

  // Add a dedicated method to list clusters
  listClusters: async () => {
    try {
      const online = await isServerOnline();

      if (!online) {
        console.log('Backend server is not available, returning empty clusters (no mock data)');
        return [];
      }

      const response = await api.get('/api/clusters/list');

      if (response.data && Array.isArray(response.data)) {
        console.log('Successfully fetched clusters from API');
        return response.data;
      }

      throw new Error('Invalid data received from clusters list API');
    } catch (error: unknown) {
      console.error('Error listing clusters:', error instanceof Error ? error.message : 'Unknown error');
      // Return empty array
      return [];
    }
  },

  getApplications: async (): Promise<Application[]> => {
    try {
      // Check if server is online
      const online = await isServerOnline();

      if (!online) {
        console.log('Backend server is not available, returning empty array (no mock data)');
        return [];
      }

      console.log('✅ Fetching applications from API...');
      // Try to get data from API
      const response = await api.get('/api/apps/list');
      const responseData = response.data;

      console.log('✅ Raw API response:', responseData);

      // Also check Kubernetes directly for running applications via backend API
      try {
        console.log('✅ Checking for Kubernetes pods via backend...');
        const k8sResponse = await api.get('/api/cluster/status');
        console.log('✅ Cluster status response:', k8sResponse.data);
      } catch (k8sError) {
        console.warn('⚠️ Unable to check Kubernetes directly:', k8sError);
      }

      // Extract the applications array from the response
      const applications = responseData.data || responseData;

      if (Array.isArray(applications)) {
        console.log('✅ Fetched applications from API:', applications);
        return applications;
      } else {
        console.error('❌ API response format:', responseData);
        throw new Error('API did not return a valid array of applications');
      }
    } catch (error: unknown) {
      console.error('Error in getApplications:', error instanceof Error ? error.message : 'Unknown error');
      // Return empty array if there's an error
      return [];
    }
  },

  // Get configuration for a Kind cluster
  getKindConfig: async (clusterName: string): Promise<any> => {
    try {
      const online = await isServerOnline();

      if (!online) {
        console.log('Backend server is not available, returning mock cluster config');
        return {
          kind: 'Cluster',
          apiVersion: 'kind.x-k8s.io/v1alpha4',
          name: clusterName,
          nodes: [
            { role: 'control-plane' },
            { role: 'worker' }
          ]
        };
      }

      console.log(`Fetching configuration for cluster ${clusterName}...`);

      // Try direct fetch first for more reliable results
      try {
        const directResponse = await fetch(`${API_BASE_URL}/api/cluster/${clusterName}/config`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (directResponse.ok) {
          const directData = await directResponse.json();
          console.log('DIRECT CONFIG RESPONSE:', JSON.stringify(directData, null, 2));

          if (directData.data) {
            console.log('✅ Successfully fetched cluster config directly');
            return directData.data;
          }
        } else {
          console.log(`❌ Direct config fetch failed with status: ${directResponse.status}`);
        }
      } catch (directError) {
        console.error('❌ Error with direct config fetch:',
          directError instanceof Error ? directError.message : 'Unknown error');
      }

      // Fallback to axios
      console.log('Trying axios approach as fallback for config');
      const response = await api.get(`/api/cluster/${clusterName}/config`);

      if (response.status >= 200 && response.status < 300 && response.data) {
        console.log('✅ Successfully fetched cluster config via axios');
        if (response.data.data) {
          return response.data.data;
        }
        return response.data;
      } else {
        throw new Error(`Failed to get cluster config: ${response.data?.message || 'Unknown error'}`);
      }
    } catch (error: unknown) {
      console.error(`Error getting cluster config for ${clusterName}:`, error instanceof Error ? error.message : 'Unknown error');
      // Return basic cluster config
      console.log('⚠️ Error fetching config, returning mock config');
      return {
        kind: 'Cluster',
        apiVersion: 'kind.x-k8s.io/v1alpha4',
        name: clusterName,
        nodes: [
          { role: 'control-plane' },
          { role: 'worker' }
        ]
      };
    }
  },

  // Create a new Kind cluster with improved task-based response handling
  async createCluster(
    clusterName: string,
    environment: string,
    workerNodes: number,
    controlPlaneNodes: number = 1,
    config: any = {}
  ): Promise<any> {
    try {
      console.log(`🚀 Creating cluster "${clusterName}" with ${workerNodes} worker nodes and ${controlPlaneNodes} control plane nodes`);
      console.log('Advanced config:', JSON.stringify(config, null, 2));

      // Check if server is online
      const isOnline = await isServerOnline();
      if (!isOnline) {
        console.warn('⚠️ Backend server is not available. Using mock data.');
        return {
          success: true,
          status: 'completed',
          message: 'Cluster creation completed (mock)',
          cluster: {
            name: clusterName,
            status: 'Running',
            nodes: workerNodes + controlPlaneNodes,
            created: new Date().toISOString()
          }
        };
      }

      // First check if a cluster with this name already exists
      console.log(`Checking if cluster "${clusterName}" already exists...`);
      const clusterExists = await this.checkClusterExists(clusterName);
      if (clusterExists) {
        console.log(`Cluster "${clusterName}" already exists, returning success`);
        return {
          success: true,
          status: 'completed',
          message: `Cluster "${clusterName}" already exists`,
          cluster: {
            name: clusterName,
            status: 'Running',
            nodes: workerNodes + controlPlaneNodes,
            created: new Date().toISOString()
          }
        };
      }

      // Prepare the request payload with proper structure
      const payload: any = {
        name: clusterName,
        environment,
        worker_nodes: workerNodes,
        apply_resource_limits: true
      };

      // Add worker_config if provided
      if (config && config.worker_config) {
        payload.worker_config = {
          cpu: config.worker_config.cpu,
          memory: config.worker_config.memory
        };
      }

      // Add control_plane_config if provided
      if (config && config.control_plane_config) {
        payload.control_plane_config = {
          cpu: config.control_plane_config.cpu,
          memory: config.control_plane_config.memory
        };
      }

      // Add apply_resource_limits if provided
      if (config && config.apply_resource_limits !== undefined) {
        payload.apply_resource_limits = config.apply_resource_limits;
      }

      console.log('📤 Sending cluster creation request with payload:', JSON.stringify(payload, null, 2));

      // Try with fetch first for more reliable results
      let taskId: string | null = null;
      let responseData: any = null;

      try {
        console.log(`📡 Making direct fetch POST to ${API_BASE_URL}/api/cluster/create`);

        const directResponse = await fetch(`${API_BASE_URL}/api/cluster/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (directResponse.ok) {
          responseData = await directResponse.json();
          console.log('✅ CREATE RESPONSE (FETCH):', JSON.stringify(responseData, null, 2));

          // Try different possible locations for the task_id in the response
          if (responseData && responseData.data && responseData.data.task_id) {
            taskId = responseData.data.task_id;
          } else if (responseData && responseData.task_id) {
            taskId = responseData.task_id;
          }
        } else {
          console.log(`❌ Direct POST failed with status: ${directResponse.status}`);
          const errorText = await directResponse.text();
          console.error('Error response:', errorText);
        }
      } catch (directError) {
        console.error('❌ Error with direct fetch POST:',
          directError instanceof Error ? directError.message : 'Unknown error');
      }

      // Fallback to axios if fetch fails or doesn't return a task ID
      if (!taskId) {
        try {
          console.log('📡 Trying axios POST as fallback (using cluster API with longer timeout)');
          const response = await clusterApi_axios.post('/api/cluster/create', payload);

          if (response.status >= 200 && response.status < 300) {
            console.log('✅ Cluster creation initiated successfully (AXIOS):', response.data);
            responseData = response.data;

            // Try different possible locations for the task_id in the response
            if (response.data && response.data.data && response.data.data.task_id) {
              taskId = response.data.data.task_id;
            } else if (response.data && response.data.task_id) {
              taskId = response.data.task_id;
            }
          } else {
            throw new Error(`Failed to create cluster: ${response.data?.message || 'Unknown error'}`);
          }
        } catch (axiosError: any) {
          console.error('❌ Error with axios POST:', axiosError);

          // Check if the cluster exists despite the error
          console.log('Checking if cluster exists despite API error...');
          const existsAfterError = await this.checkClusterExists(clusterName);

          if (existsAfterError) {
            console.log(`Cluster "${clusterName}" exists despite API error, returning success`);
            return {
              success: true,
              status: 'completed',
              message: `Cluster "${clusterName}" created successfully (verified by direct check)`,
              cluster: {
                name: clusterName,
                status: 'Running',
                nodes: workerNodes + controlPlaneNodes,
                created: new Date().toISOString()
              }
            };
          }

          throw axiosError;
        }
      }

      // If we got a task ID, poll for updates
      if (taskId) {
        console.log(`🔑 Got task ID for tracking: ${taskId}`);

        // Poll the task status using the class method, passing the cluster name
        // Poll every 5s for max 120 attempts (10 minutes)
        return await clusterApi.pollTaskStatus(taskId, 5000, 120, clusterName);
      }

      // If we didn't get a task ID but the request was successful, check if the cluster exists
      if (responseData && (responseData.status === 'success' || responseData.success)) {
        console.log('Request was successful but no task ID was returned, checking if cluster exists...');
        const existsAfterRequest = await this.checkClusterExists(clusterName);

        if (existsAfterRequest) {
          console.log(`Cluster "${clusterName}" exists after request, returning success`);
          return {
            success: true,
            status: 'completed',
            message: `Cluster "${clusterName}" created successfully (verified by direct check)`,
            cluster: {
              name: clusterName,
              status: 'Running',
              nodes: workerNodes + controlPlaneNodes,
              created: new Date().toISOString()
            }
          };
        }
      }

      // If we get here, we don't have a task ID and the cluster doesn't exist yet
      // Return the response data with a success flag
      return {
        ...responseData,
        success: true,
        message: responseData?.message || `Cluster "${clusterName}" creation initiated`
      };
    } catch (error: any) {
      console.error('❌ Error in createCluster:', error);

      // One final check to see if the cluster exists despite the error
      try {
        console.log('Final check: seeing if cluster exists despite all errors...');
        const clusterExists = await this.checkClusterExists(clusterName);

        if (clusterExists) {
          console.log(`Cluster "${clusterName}" exists despite all errors, returning success`);
          return {
            success: true,
            status: 'completed',
            message: `Cluster "${clusterName}" created successfully (verified by direct check)`,
            cluster: {
              name: clusterName,
              status: 'Running',
              nodes: workerNodes + controlPlaneNodes,
              created: new Date().toISOString()
            }
          };
        }
      } catch (finalCheckError) {
        console.error('Error in final cluster existence check:', finalCheckError);
      }

      // Format the error message
      let errorMessage = 'Failed to create cluster';

      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        errorMessage = error.response.data?.message || error.response.data?.error || errorMessage;
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        errorMessage = 'No response from server. Please check if the backend is running.';
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error setting up the request:', error.message);
        errorMessage = error.message || errorMessage;
      }

      return {
        success: false,
        status: 'failed',
        message: errorMessage,
        error: errorMessage
      };
    }
  },

  // Check if a cluster exists by name using the robust cluster checker
  async checkClusterExists(clusterName: string): Promise<boolean> {
    try {
      console.log(`Checking if cluster ${clusterName} exists using robust checker...`);

      // First try the robust cluster checker which has multiple fallback methods
      const robustExists = await robustCheckClusterExists(clusterName);
      if (robustExists) {
        console.log(`✅ Cluster ${clusterName} exists (confirmed by robust checker)`);
        return true;
      }

      // If robust checker fails, try our own simple check as a final fallback
      console.log(`Robust checker didn't find cluster, trying simple status check...`);

      // Use AbortController to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        try {
          controller.abort(new DOMException('Timeout exceeded', 'TimeoutError'));
        } catch (e) {
          console.warn('Error aborting controller:', e);
        }
      }, 10000); // 10s timeout for simple check

      try {
        const response = await fetch(`${API_BASE_URL}/api/cluster/status`, {
          signal: controller.signal,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.error(`Failed to get cluster status: ${response.status}`);
          return false;
        }

        const data = await response.json();
        console.log('Simple cluster status response:', data);

        // Check if our cluster is in the list
        const clusters = data.data?.clusters || [];
        const clusterExists = clusters.some((cluster: any) => cluster.name === clusterName);

        console.log(`Cluster ${clusterName} exists (simple check): ${clusterExists}`);
        return clusterExists;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.warn('Simple fetch check failed:', fetchError);
        return false;
      }
    } catch (error) {
      console.error('Error checking if cluster exists:', error);
      return false;
    }
  },

  // Poll task status with callback support (for create cluster page)
  async pollTaskStatus(
    taskId: string,
    onUpdateOrInterval?: ((status: any) => void) | number,
    onCompleteOrMaxAttempts?: ((status: any) => void) | number,
    onErrorOrClusterName?: ((error: any) => void) | string,
    intervalMs: number = 2000,
    timeoutMs: number = 600000, // Increased to 10 minutes for cluster operations
    clusterName?: string // Add cluster name parameter for callback-based interface
  ): Promise<any> {
    // Check if this is the callback-based interface (create cluster page)
    if (typeof onUpdateOrInterval === 'function') {
      const onUpdate = onUpdateOrInterval;
      const onComplete = onCompleteOrMaxAttempts as (status: any) => void;
      const onError = onErrorOrClusterName as (error: any) => void;

      console.log(`🔄 Starting callback-based task polling for task ID: ${taskId}`);

      const startTime = Date.now();
      let attempts = 0;
      const maxAttempts = Math.floor(timeoutMs / intervalMs);

      const pollLoop = async () => {
        attempts++;

        // Check for global timeout
        if (Date.now() - startTime > timeoutMs) {
          console.warn(`Global timeout of ${timeoutMs}ms exceeded for task ${taskId}`);

          // If we have a cluster name, check if it exists despite the timeout
          if (clusterName) {
            console.log('Global timeout reached, checking if cluster exists anyway...');
            try {
              const clusterExists = await robustCheckClusterExists(clusterName);

              if (clusterExists) {
                console.log('Cluster exists despite global timeout, marking as success');
                const successStatus = {
                  status: 'completed',
                  completed: true,
                  success: true,
                  message: 'Cluster created successfully (verified by direct check after timeout)'
                };
                onComplete(successStatus);
                return;
              }
            } catch (checkError) {
              console.warn('Error checking cluster existence after timeout:', checkError);
            }
          }

          const error = new Error(`Task polling timed out after ${timeoutMs}ms`);
          error.name = 'TaskPollingTimeout';
          (error as any).isTaskTimeout = true;
          onError(error);
          return;
        }

        try {
          console.log(`📊 Polling task status (attempt ${attempts}/${maxAttempts})...`);

          // Use AbortController for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            controller.abort(new DOMException('Request timeout', 'TimeoutError'));
          }, 20000); // 20 seconds for task status polling (reduced from 30s)

          const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
            signal: controller.signal,
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            }
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const responseData = await response.json();
          console.log(`📊 Task status response:`, responseData);

          // Handle different response formats more robustly (same as legacy polling)
          const taskData = responseData.data || responseData;

          // Normalize status to handle multiple possible field names and formats
          let status = '';
          if (taskData.status) {
            status = String(taskData.status).toLowerCase();
          } else if (taskData.state) {
            status = String(taskData.state).toLowerCase();
          } else if (taskData.task_status) {
            status = String(taskData.task_status).toLowerCase();
          } else if (taskData.result && taskData.result.status) {
            status = String(taskData.result.status).toLowerCase();
          }

          // Handle progress from multiple possible sources
          const progress = taskData.progress || taskData.percent_complete || taskData.completion || 0;
          const message = taskData.message || taskData.result?.message || '';

          // Check for completion indicators in various formats
          const isCompleted = taskData.completed === true ||
                             taskData.is_completed === true ||
                             taskData.finished === true ||
                             taskData.done === true ||
                             (taskData.result && taskData.result.completed === true);

          const isSuccessful = taskData.success === true ||
                              taskData.successful === true ||
                              (taskData.result && taskData.result.success === true) ||
                              status === 'success' ||
                              status === 'successful';

          // Create normalized status object
          const normalizedStatus = {
            status,
            progress,
            message,
            success: isSuccessful,
            completed: isCompleted || ['completed', 'succeeded', 'success', 'successful'].includes(status),
            ...taskData
          };

          // Call onUpdate callback
          onUpdate(normalizedStatus);

          // Check if task is completed
          if (normalizedStatus.completed) {
            console.log(`✅ Task completed with status: ${status}`);
            console.log('🔍 DEBUG: Task completion in polling function:', {
              status,
              normalizedStatus,
              taskData,
              isSuccessful,
              isCompleted
            });

            // Special handling for "failed" tasks - check if cluster actually exists
            if (status === 'failed' && taskData.details && taskData.details.cluster_name) {
              const clusterName = taskData.details.cluster_name;
              console.log(`🔍 Task marked as failed, but checking if cluster '${clusterName}' actually exists...`);

              try {
                // Check if cluster exists using our robust cluster checker
                const clusterExists = await robustCheckClusterExists(clusterName);

                if (clusterExists) {
                  console.log(`✅ Cluster '${clusterName}' exists despite task failure - treating as success`);

                  // Override the failed status with success
                  const successStatus = {
                    ...normalizedStatus,
                    status: 'completed',
                    success: true,
                    completed: true,
                    message: `Cluster '${clusterName}' created successfully (verified by existence check)`
                  };

                  onComplete(successStatus);
                  return;
                } else {
                  console.log(`❌ Cluster '${clusterName}' does not exist - task genuinely failed`);
                }
              } catch (error) {
                console.warn(`⚠️ Error checking cluster existence:`, error);
                // Continue with original failed status
              }
            }

            onComplete(normalizedStatus);
            return;
          }

          // Continue polling if not completed with improved timing
          // Add some jitter to avoid thundering herd
          const jitter = Math.random() * 1000;
          const nextPollDelay = intervalMs + jitter;

          setTimeout(pollLoop, nextPollDelay);

        } catch (error: any) {
          console.error(`❌ Error polling task status:`, error);

          // Mark timeout errors properly for better error handling
          if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
            error.name = 'TaskPollingTimeout';
            (error as any).isTaskTimeout = true;
          }

          if (attempts >= maxAttempts) {
            // Final check for cluster existence before giving up
            if (clusterName) {
              console.log('Final check: seeing if cluster exists despite all errors...');
              try {
                const clusterExists = await robustCheckClusterExists(clusterName);

                if (clusterExists) {
                  console.log('Cluster exists despite all errors, marking as success');
                  const successStatus = {
                    status: 'completed',
                    completed: true,
                    success: true,
                    message: 'Cluster created successfully despite all errors'
                  };
                  onComplete(successStatus);
                  return;
                }
              } catch (checkError) {
                console.warn('Error checking cluster existence after all errors:', checkError);
              }
            }

            // Mark timeout errors properly
            if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
              error.name = 'TaskPollingTimeout';
              (error as any).isTaskTimeout = true;
            }
            onError(error);
            return;
          }

          // Retry with improved exponential backoff
          let backoffDelay = intervalMs;

          if (attempts > 5) {
            // After 5 attempts, start increasing the delay
            backoffDelay = Math.min(intervalMs * Math.pow(1.3, Math.floor((attempts - 5) / 2)), 12000);
          }

          // Add jitter to avoid thundering herd
          const jitter = Math.random() * 1000;
          const finalDelay = backoffDelay + jitter;

          setTimeout(pollLoop, finalDelay);
        }
      };

      // Start polling
      pollLoop();
      return; // Don't return a promise for callback-based interface
    }

    // Legacy interface (for backward compatibility)
    const interval = onUpdateOrInterval as number || 5000;
    const maxAttempts = onCompleteOrMaxAttempts as number || 36;
    const legacyClusterName = onErrorOrClusterName as string;
    let attempts = 0;
    let lastProgress = 0;
    let progressStuckCount = 0;
    const MAX_PROGRESS_STUCK = 5; // How many times progress can be stuck before we check cluster existence

    // Add a global timeout for the entire polling process
    const startTime = Date.now();
    const GLOBAL_TIMEOUT_MS = 480000; // 8 minutes total timeout for cluster operations (reduced from 10 minutes)

    console.log(`Starting task polling for task ${taskId} with ${maxAttempts} max attempts, interval ${interval}ms, and global timeout ${GLOBAL_TIMEOUT_MS}ms`);

    const checkStatus = async (): Promise<any> => {
      attempts++;

      // Check if we've exceeded the global timeout
      if (Date.now() - startTime > GLOBAL_TIMEOUT_MS) {
        console.warn(`Global timeout of ${GLOBAL_TIMEOUT_MS}ms exceeded for task ${taskId}`);

        // If we have a cluster name, check if it exists despite the timeout
        if (legacyClusterName) {
          console.log('Global timeout reached, checking if cluster exists anyway...');
          const clusterExists = await robustCheckClusterExists(legacyClusterName);

          if (clusterExists) {
            console.log('Cluster exists despite global timeout, marking as success');
            return {
              status: 'completed',
              completed: true,
              success: true,
              message: 'Cluster created successfully (verified by direct check after timeout)'
            };
          }
        }

        throw new Error(`Global timeout of ${GLOBAL_TIMEOUT_MS}ms exceeded for task ${taskId}`);
      }

      console.log(`Checking task status (attempt ${attempts}/${maxAttempts})...`);

      try {
        // First try with fetch API for better error handling
        let responseData: any;
        try {
          // Use AbortController to prevent hanging requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            try {
              controller.abort(new DOMException('Timeout exceeded', 'TimeoutError'));
            } catch (e) {
              console.warn('Error aborting controller:', e);
            }
          }, 10000); // 10s timeout for task status polling (reduced from 20s)

          const fetchResponse = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
            signal: controller.signal,
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });

          clearTimeout(timeoutId);

          if (!fetchResponse.ok) {
            const errorData = await fetchResponse.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${fetchResponse.status}`);
          }

          responseData = await fetchResponse.json();
        } catch (fetchError: any) {
          console.warn('Fetch API failed, falling back to axios:', fetchError);

          // Handle timeout errors specifically
          if (fetchError.name === 'TimeoutError' || fetchError.message?.includes('timeout')) {
            console.warn(`Task polling timeout for ${taskId}, attempting axios fallback...`);
          }

          try {
            // Fall back to axios if fetch fails
            const axiosResponse = await api.get(`/api/tasks/${taskId}`, {
              params: { _: Date.now() }, // Add cache busting
              timeout: 15000 // Shorter timeout for axios fallback
            });
            responseData = axiosResponse.data;
          } catch (axiosError: any) {
            // If both fetch and axios fail, handle gracefully
            if (axiosError.name === 'TaskPollingTimeout' ||
                axiosError.message === 'TASK_POLLING_TIMEOUT' ||
                axiosError.isTaskTimeout ||
                axiosError.message?.includes('Task polling timeout')) {
              console.warn(`Both fetch and axios timed out for task ${taskId}, returning unknown status`);
              responseData = {
                id: taskId,
                status: 'unknown',
                progress: lastProgress || 0,
                message: 'Task status check timed out - task may still be running',
                result: null,
                error: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
            } else {
              throw axiosError;
            }
          }
        }

        console.log(`Task status response:`, responseData);

        // Handle different response formats more robustly
        const taskData = responseData.data || responseData;

        // Normalize status to handle multiple possible field names and formats
        let status = '';
        if (taskData.status) {
          status = String(taskData.status).toLowerCase();
        } else if (taskData.state) {
          status = String(taskData.state).toLowerCase();
        } else if (taskData.task_status) {
          status = String(taskData.task_status).toLowerCase();
        } else if (taskData.result && taskData.result.status) {
          status = String(taskData.result.status).toLowerCase();
        }

        // Handle progress from multiple possible sources
        const progress = taskData.progress || taskData.percent_complete || taskData.completion || 0;

        // Check for completion indicators in various formats
        const isCompleted = taskData.completed === true ||
                           taskData.is_completed === true ||
                           taskData.finished === true ||
                           taskData.done === true ||
                           (taskData.result && taskData.result.completed === true);

        const isSuccessful = taskData.success === true ||
                            taskData.successful === true ||
                            (taskData.result && taskData.result.success === true) ||
                            status === 'success' ||
                            status === 'successful';

        console.log(`Task ${taskId} status:`, status, 'progress:', progress, 'completed:', isCompleted, 'successful:', isSuccessful);

        // Check if progress is stuck
        if (progress === lastProgress && ['running', 'pending', 'started', 'processing'].includes(status)) {
          progressStuckCount++;
          console.log(`Progress stuck at ${progress}% for ${progressStuckCount} checks`);

          // If progress is stuck for too long, check if the cluster exists
          if (progressStuckCount >= MAX_PROGRESS_STUCK && legacyClusterName) {
            console.log(`Progress stuck at ${progress}% for too long, checking if cluster exists...`);
            const clusterExists = await robustCheckClusterExists(legacyClusterName);

            if (clusterExists) {
              console.log('Cluster exists despite stuck progress, marking as success');
              return {
                status: 'completed',
                completed: true,
                success: true,
                message: 'Cluster created successfully (verified by direct check)'
              };
            }
          }
        } else {
          // Reset the counter if progress changes
          progressStuckCount = 0;
          lastProgress = progress;
        }

        // Check for completion using normalized fields
        if (status === 'completed' || status === 'succeeded' || status === 'success' || status === 'successful' || isCompleted) {
          console.log('Task completed successfully:', taskData);
          return {
            ...taskData,
            status: 'completed',
            completed: true,
            success: isSuccessful || taskData.success !== false, // Use normalized success check
            message: taskData.message || taskData.result?.message || 'Task completed successfully'
          };
        }

        // Check for failure using multiple indicators
        if (status === 'failed' || status === 'error' || status === 'failure' || taskData.error || taskData.failed === true) {
          // If we have a cluster name, check if the cluster exists despite the task failure
          if (legacyClusterName) {
            console.log('Task reported failure, checking if cluster exists anyway...');
            const clusterExists = await robustCheckClusterExists(legacyClusterName);

            if (clusterExists) {
              console.log('Cluster exists despite task failure, marking as success');
              return {
                ...taskData,
                status: 'completed',
                completed: true,
                success: true,
                message: 'Cluster created successfully despite task status reporting failure'
              };
            }
          }

          throw new Error(`Task failed: ${taskData.message || taskData.error || 'Unknown error'}`);
        }

        // Handle in-progress states and unknown status
        if (['running', 'pending', 'started', 'processing', 'unknown'].includes(status) || !status) {
          if (attempts >= maxAttempts) {
            // If we have a cluster name, check if the cluster exists despite the task timeout
            if (legacyClusterName) {
              console.log('Task timed out, checking if cluster exists anyway...');
              const clusterExists = await robustCheckClusterExists(legacyClusterName);

              if (clusterExists) {
                console.log('Cluster exists despite task timeout, marking as success');
                return {
                  status: 'completed',
                  completed: true,
                  success: true,
                  message: 'Cluster created successfully despite task status timeout'
                };
              }
            }

            throw new Error('Task timed out: Maximum polling attempts reached');
          }

          // Continue polling with improved exponential backoff
          // Start with the base interval, then gradually increase for stuck tasks
          let backoffDelay = interval;

          if (attempts > 10) {
            // After 10 attempts, start increasing the delay
            backoffDelay = Math.min(interval * Math.pow(1.3, Math.floor((attempts - 10) / 3)), 15000);
          }

          // Add some jitter to avoid thundering herd
          const jitter = Math.random() * 1000;
          const finalDelay = backoffDelay + jitter;

          console.log(`Task in progress, polling again in ${Math.round(finalDelay)}ms... (attempt ${attempts}/${maxAttempts})`);

          await delay(finalDelay);
          return checkStatus();
        }

        // Handle unknown status
        console.warn('Unknown task status:', taskData);
        if (attempts >= maxAttempts) {
          // If we have a cluster name, check if the cluster exists despite the unknown status
          if (legacyClusterName) {
            console.log('Task has unknown status, checking if cluster exists anyway...');
            const clusterExists = await robustCheckClusterExists(legacyClusterName);

            if (clusterExists) {
              console.log('Cluster exists despite unknown task status, marking as success');
              return {
                status: 'completed',
                completed: true,
                success: true,
                message: 'Cluster created successfully despite unknown task status'
              };
            }
          }

          throw new Error('Task completed with unknown status');
        }

        await delay(interval);
        return checkStatus();
      } catch (error: any) {
        console.error('Error in checkStatus:', error);

        // After a few attempts, check if the cluster exists directly
        if (legacyClusterName && (attempts % 3 === 0 || attempts >= maxAttempts - 1)) {
          console.log('Task status polling error, checking if cluster exists directly...');
          const clusterExists = await robustCheckClusterExists(legacyClusterName);

          if (clusterExists) {
            console.log('Cluster exists despite task status API errors, marking as success');
            return {
              status: 'completed',
              completed: true,
              success: true,
              message: 'Cluster created successfully despite task status API errors'
            };
          }
        }

        // If we've reached max attempts or this is a non-retryable error, rethrow
        if (attempts >= maxAttempts || error.message?.includes('404')) {
          // One final check for cluster existence
          if (legacyClusterName) {
            console.log('Final check: seeing if cluster exists despite all errors...');
            const clusterExists = await robustCheckClusterExists(legacyClusterName);

            if (clusterExists) {
              console.log('Cluster exists despite all errors, marking as success');
              return {
                status: 'completed',
                completed: true,
                success: true,
                message: 'Cluster created successfully despite all errors'
              };
            }
          }

          throw new Error(`Failed to get task status after ${attempts} attempts: ${error.message}`);
        }

        // Otherwise, wait and retry
        const backoff = Math.min(interval * Math.pow(1.5, Math.floor(attempts/3)), 10000);
        console.log(`Error occurred, retrying in ${backoff}ms...`);
        await delay(backoff);
        return checkStatus();
      }
    };

    // Start the polling
    return checkStatus();
  },

  // Get application templates
  getAppTemplates: async () => {
    try {
      const online = await isServerOnline();

      if (!online) {
        console.log('Backend server is not available, returning empty templates (no mock data)');
        return [];
      }

      const response = await api.get('/api/apps/templates');

      if (response.status >= 200 && response.status < 300) {
        return response.data;
      } else {
        throw new Error(`Failed to get app templates: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error: unknown) {
      console.error('Error getting app templates:', error instanceof Error ? error.message : 'Unknown error');
      // Return empty array on error (no mock data)
      return [];
    }
  },

  // Get cluster task status (for deploy app page compatibility)
  getClusterTaskStatus: async (taskId: string): Promise<any> => {
    try {
      const online = await isServerOnline();

      if (!online) {
        console.log('Backend server is not available, returning mock task status');
        return {
          status: 'completed',
          completed: true,
          success: true,
          message: 'Task completed successfully (mock)'
        };
      }

      console.log(`Getting task status for task ID: ${taskId}`);

      const response = await api.get(`/api/tasks/${taskId}`);

      if (response.status >= 200 && response.status < 300) {
        const taskData = response.data.data || response.data;

        // Normalize the response format
        return {
          status: taskData.status || 'unknown',
          completed: taskData.completed || false,
          success: taskData.success || false,
          message: taskData.message || '',
          progress: taskData.progress || 0,
          ...taskData
        };
      } else {
        throw new Error(`Failed to get task status: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error: unknown) {
      console.error(`Error getting task status for ${taskId}:`, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  },

  // Delete a cluster
  deleteCluster: async (clusterName: string): Promise<any> => {
    try {
      console.log(`🗑️ Attempting to delete cluster: ${clusterName}`);

      const online = await isServerOnline();

      if (!online) {
        console.log('Backend server is not available, returning mock success response');
        return {
          success: true,
          message: `Cluster ${clusterName} deleted successfully (mock)`,
          cluster_name: clusterName
        };
      }

      // Use the cluster API with longer timeout for delete operations
      const response = await clusterApi_axios.delete(`/api/cluster/${clusterName}`);

      if (response.status >= 200 && response.status < 300) {
        console.log(`✅ Cluster ${clusterName} deleted successfully:`, response.data);
        return {
          success: true,
          message: `Cluster ${clusterName} deleted successfully`,
          cluster_name: clusterName,
          ...response.data
        };
      } else {
        throw new Error(`Failed to delete cluster: ${response.data?.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error(`❌ Error deleting cluster ${clusterName}:`, error);

      // Format the error message
      let errorMessage = `Failed to delete cluster ${clusterName}`;

      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        errorMessage = error.response.data?.message || error.response.data?.error || errorMessage;
      } else if (error.request) {
        console.error('No response received:', error.request);
        errorMessage = 'No response from server. Please check if the backend is running.';
      } else {
        console.error('Error setting up the request:', error.message);
        errorMessage = error.message || errorMessage;
      }

      return {
        success: false,
        message: errorMessage,
        error: errorMessage,
        cluster_name: clusterName
      };
    }
  },

  // Set resource limits for a cluster
  setResourceLimits: async (
    clusterName: string,
    workerCpu: number,
    workerMemory: string,
    controlPlaneCpu: number,
    controlPlaneMemory: string
  ): Promise<any> => {
    try {
      const online = await isServerOnline();

      if (!online) {
        console.log('Backend server is not available, returning mock success response');
        return {
          success: true,
          message: `Resource limits updated successfully for ${clusterName} (mock)`
        };
      }

      console.log(`Setting resource limits for cluster ${clusterName}:`, {
        workerCpu,
        workerMemory,
        controlPlaneCpu,
        controlPlaneMemory
      });

      // Use the standardized endpoint
      const response = await api.post(`/api/cluster/${clusterName}/set-resource-limits`, {
        worker_config: {
          cpu: workerCpu.toString(),
          memory: workerMemory
        },
        control_plane_config: {
          cpu: controlPlaneCpu.toString(),
          memory: controlPlaneMemory
        }
      });

      if (response.status >= 200 && response.status < 300) {
        console.log('Resource limits updated successfully:', response.data);
        return response.data;
      } else {
        throw new Error(`Failed to update resource limits: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error: unknown) {
      console.error(`Error setting resource limits for ${clusterName}:`, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  },

  // Application management methods
  manageApplication: async (taskId: string, action: string, clusterName: string, namespace: string = 'default') => {
    try {
      console.log(`🔧 Managing application ${taskId} with action: ${action}`);

      const online = await isServerOnline();
      if (!online) {
        throw new Error('Backend server is not available');
      }

      const response = await api.post(`/api/apps/${taskId}/action`, {
        action,
        cluster_name: clusterName,
        namespace
      });

      console.log('✅ Application management response:', response.status, response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error managing application:', error);
      throw error;
    }
  },

  scaleApplication: async (taskId: string, replicas: number, clusterName: string, namespace: string = 'default') => {
    try {
      console.log(`📏 Scaling application ${taskId} to ${replicas} replicas`);

      const online = await isServerOnline();
      if (!online) {
        throw new Error('Backend server is not available');
      }

      const response = await api.post(`/api/apps/${taskId}/scale`, {
        replicas,
        cluster_name: clusterName,
        namespace
      });

      console.log('✅ Application scaling response:', response.status, response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error scaling application:', error);
      throw error;
    }
  },

  getApplicationDetails: async (taskId: string, clusterName: string, namespace: string = 'default') => {
    try {
      console.log(`📋 Getting details for application ${taskId}`);

      const online = await isServerOnline();
      if (!online) {
        console.log('Backend server is not available, returning mock details');
        return {
          success: true,
          data: {
            task: { id: taskId, status: 'running' },
            deployment: { name: 'mock-app', replicas: 1, ready_replicas: 1 },
            pods: [{ name: 'mock-pod-1', phase: 'Running', ready: true }]
          }
        };
      }

      const response = await api.get(`/api/apps/${taskId}/details`, {
        params: {
          cluster_name: clusterName,
          namespace
        }
      });

      console.log('✅ Application details response:', response.status, response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting application details:', error);
      throw error;
    }
  },

  getApplicationLogs: async (taskId: string, clusterName: string, namespace: string = 'default', lines: number = 100) => {
    try {
      console.log(`📜 Getting logs for application ${taskId}`);

      const online = await isServerOnline();
      if (!online) {
        console.log('Backend server is not available, returning mock logs');
        return {
          success: true,
          data: {
            logs: 'Mock log entry 1\nMock log entry 2\nApplication is running...',
            app_name: 'mock-app',
            namespace,
            cluster: clusterName
          }
        };
      }

      const response = await api.get(`/api/apps/${taskId}/logs`, {
        params: {
          cluster_name: clusterName,
          namespace,
          lines
        }
      });

      console.log('✅ Application logs response:', response.status, response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting application logs:', error);
      throw error;
    }
  },

  getApplicationMetrics: async (taskId: string, clusterName: string, namespace: string = 'default') => {
    try {
      console.log(`📊 Getting metrics for application ${taskId}`);

      const online = await isServerOnline();
      if (!online) {
        console.log('Backend server is not available, returning mock metrics');
        return {
          success: true,
          data: {
            metrics: [
              { pod_name: 'mock-pod-1', cpu: '10m', memory: '64Mi' }
            ],
            resources: {
              requests: { cpu: '100m', memory: '128Mi' },
              limits: { cpu: '200m', memory: '256Mi' }
            },
            app_name: 'mock-app',
            namespace,
            cluster: clusterName
          }
        };
      }

      const response = await api.get(`/api/apps/${taskId}/metrics`, {
        params: {
          cluster_name: clusterName,
          namespace
        }
      });

      console.log('✅ Application metrics response:', response.status, response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting application metrics:', error);
      throw error;
    }
  },

  // New detailed cluster information endpoints
  getClusterDetails: async (clusterName: string) => {
    try {
      const online = await isServerOnline();
      if (!online) {
        console.log('Backend server is not available, returning mock cluster details');
        return {
          success: true,
          data: {
            name: clusterName,
            status: 'Running',
            version: { client_version: 'v1.28.0', server_version: 'v1.28.0' },
            cluster_info: 'Mock cluster info',
            created: new Date().toISOString(),
            context: `kind-${clusterName}`
          }
        };
      }

      const response = await fetch(`${API_BASE_URL}/api/cluster/${clusterName}/details`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error(`Error getting cluster details for ${clusterName}:`, error);
      throw error;
    }
  },

  getClusterNodes: async (clusterName: string) => {
    try {
      const online = await isServerOnline();
      if (!online) {
        console.log('Backend server is not available, returning mock node data');
        return {
          success: true,
          data: {
            cluster_name: clusterName,
            node_count: 2,
            nodes: [
              {
                name: `${clusterName}-control-plane`,
                role: 'control-plane',
                status: 'Ready',
                ready: true,
                age: '1h',
                version: 'v1.28.0'
              },
              {
                name: `${clusterName}-worker`,
                role: 'worker',
                status: 'Ready',
                ready: true,
                age: '1h',
                version: 'v1.28.0'
              }
            ]
          }
        };
      }

      const response = await fetch(`${API_BASE_URL}/api/cluster/${clusterName}/nodes`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error(`Error getting cluster nodes for ${clusterName}:`, error);
      throw error;
    }
  },

  getClusterHealthDetailed: async (clusterName: string) => {
    try {
      const online = await isServerOnline();
      if (!online) {
        console.log('Backend server is not available, returning mock health data');
        return {
          success: true,
          data: {
            cluster_name: clusterName,
            overall_health: 'Healthy',
            components: [
              { name: 'scheduler', healthy: true, status: 'Healthy' },
              { name: 'controller-manager', healthy: true, status: 'Healthy' },
              { name: 'etcd-0', healthy: true, status: 'Healthy' }
            ],
            system_pods: [],
            summary: {
              total_components: 3,
              healthy_components: 3,
              total_system_pods: 0,
              healthy_system_pods: 0
            }
          }
        };
      }

      const response = await fetch(`${API_BASE_URL}/api/cluster/${clusterName}/health`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error(`Error getting cluster health for ${clusterName}:`, error);
      throw error;
    }
  },

  getClusterResources: async (clusterName: string) => {
    try {
      const online = await isServerOnline();
      if (!online) {
        console.log('Backend server is not available, returning mock resource data');
        return {
          success: true,
          data: {
            cluster_name: clusterName,
            namespaces: [
              {
                name: 'default',
                pod_count: 0,
                running_pods: 0,
                service_count: 1,
                deployment_count: 0,
                status: 'Active'
              },
              {
                name: 'kube-system',
                pod_count: 8,
                running_pods: 8,
                service_count: 1,
                deployment_count: 2,
                status: 'Active'
              }
            ],
            summary: {
              total_namespaces: 2,
              total_pods: 8,
              total_services: 2,
              total_deployments: 2
            }
          }
        };
      }

      const response = await fetch(`${API_BASE_URL}/api/cluster/${clusterName}/resources`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error(`Error getting cluster resources for ${clusterName}:`, error);
      throw error;
    }
  },

  getClusterNetwork: async (clusterName: string) => {
    try {
      const online = await isServerOnline();
      if (!online) {
        console.log('Backend server is not available, returning mock network data');
        return {
          success: true,
          data: {
            cluster_name: clusterName,
            services: [
              {
                name: 'kubernetes',
                namespace: 'default',
                type: 'ClusterIP',
                cluster_ip: '10.96.0.1',
                ports: [{ port: 443, target_port: 6443 }]
              }
            ],
            ingresses: [],
            summary: {
              total_services: 1,
              total_ingresses: 0,
              cluster_ip_services: 1,
              nodeport_services: 0,
              loadbalancer_services: 0
            }
          }
        };
      }

      const response = await fetch(`${API_BASE_URL}/api/cluster/${clusterName}/network`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error(`Error getting cluster network for ${clusterName}:`, error);
      throw error;
    }
  },

  getClusterStorage: async (clusterName: string) => {
    try {
      const online = await isServerOnline();
      if (!online) {
        console.log('Backend server is not available, returning mock storage data');
        return {
          success: true,
          data: {
            cluster_name: clusterName,
            storage_classes: [
              {
                name: 'standard',
                provisioner: 'rancher.io/local-path',
                reclaim_policy: 'Delete',
                volume_binding_mode: 'WaitForFirstConsumer',
                default: true
              }
            ],
            persistent_volumes: [],
            persistent_volume_claims: [],
            summary: {
              total_storage_classes: 1,
              total_persistent_volumes: 0,
              total_persistent_volume_claims: 0,
              bound_pvs: 0,
              bound_pvcs: 0
            }
          }
        };
      }

      const response = await fetch(`${API_BASE_URL}/api/cluster/${clusterName}/storage`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error(`Error getting cluster storage for ${clusterName}:`, error);
      throw error;
    }
  },

  getClusterWorkloads: async (clusterName: string) => {
    try {
      const online = await isServerOnline();
      if (!online) {
        console.log('Backend server is not available, returning mock workload data');
        return {
          success: true,
          data: {
            cluster_name: clusterName,
            pods: [],
            deployments: [],
            namespace_workloads: {},
            summary: {
              total_pods: 0,
              running_pods: 0,
              failed_pods: 0,
              total_deployments: 0,
              ready_deployments: 0
            }
          }
        };
      }

      const response = await fetch(`${API_BASE_URL}/api/cluster/${clusterName}/workloads`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error(`Error getting cluster workloads for ${clusterName}:`, error);
      throw error;
    }
  },

  getClusterEvents: async (clusterName: string, limit: number = 100) => {
    try {
      const online = await isServerOnline();
      if (!online) {
        console.log('Backend server is not available, returning mock events data');
        return {
          success: true,
          data: {
            cluster_name: clusterName,
            events: [
              {
                namespace: 'default',
                type: 'Normal',
                reason: 'Started',
                message: 'Started container',
                source: 'kubelet',
                object: { kind: 'Pod', name: 'test-pod' },
                age: '5m'
              }
            ],
            summary: {
              total_events: 1,
              warning_events: 0,
              normal_events: 1,
              recent_warnings: []
            }
          }
        };
      }

      const response = await fetch(`${API_BASE_URL}/api/cluster/${clusterName}/events?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error(`Error getting cluster events for ${clusterName}:`, error);
      throw error;
    }
  }
};
