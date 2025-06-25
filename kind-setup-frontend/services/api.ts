import axios from 'axios';

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

// Define interfaces for our API types
export interface AccessUrl {
  type: string;
  url: string;
  label: string;
  port: number;
  service: string;
}

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
  access_urls?: AccessUrl[];
}

export interface AppDetails {
  deployment?: {
    replicas: number;
    ready_replicas: number;
    available_replicas: number;
  };
  pods?: Array<{
    name: string;
    phase: string;
    ready: boolean;
    restart_count: number;
  }>;
  services?: Array<{
    name: string;
    type: string;
    cluster_ip: string;
    ports: Array<{
      name: string;
      port: number;
      targetPort: number;
    }>;
  }>;
  access_info?: {
    connection_info?: {
      type: string;
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
      connection_string: string;
      psql_command: string;
      notes?: string[];
    };
    port_forward_commands?: Array<{
      service: string;
      port_name: string;
      local_port: number;
      service_port: number;
      command: string;
      access_url: string;
    }>;
    service_urls?: string[];
  };
}

export interface AppMetrics {
  resources: {
    requests: {
      cpu: string;
      memory: string;
    };
    limits: {
      cpu: string;
      memory: string;
    };
  };
  metrics?: Array<{
    pod_name: string;
    cpu: string;
    memory: string;
  }>;
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
  environment?: string;
  created_at?: string;
}

export interface ClusterStatus {
  cluster_count: number;
  node_count: number;
  cpu_usage: number;
  clusters: Cluster[];
}

// Configure API base URL - use relative URLs since we have Next.js proxy configured
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
console.log('Using API base URL:', API_BASE_URL || 'relative URLs (proxied)');

// Create Axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    Accept: 'application/json',
  },
  timeout: 60000, // 60 seconds timeout for long operations
  withCredentials: false, // Must match backend CORS setting (both false)
  timeoutErrorMessage:
    'Request timed out - the operation is taking longer than expected',
  validateStatus: status => status >= 200 && status < 500,
});

// Add request debug interceptor
api.interceptors.request.use(config => {
  console.log(
    `🔄 Sending ${config.method?.toUpperCase()} request to: ${config.baseURL}${config.url}`
  );
  return config;
});

// Add response debug interceptor
api.interceptors.response.use(
  response => {
    console.log(
      `✅ Response from ${response.config.url}: Status ${response.status}`
    );
    return response;
  },
  error => {
    if (error.response) {
      console.error(
        `❌ Error response from API: ${error.response.status} - ${error.response.data?.message || error.message}`
      );
    } else {
      console.error(`❌ Error response from API: ${error.message}`);
    }
    return Promise.reject(error);
  }
);

// Utility to check if the server is online
const isServerOnline = async (): Promise<boolean> => {
  try {
    // First try a simple fetch with a short timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const healthUrl = API_BASE_URL ? `${API_BASE_URL}/health` : '/health';
    console.log(`🔍 Checking if backend server is online at ${healthUrl}...`);

    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log('✅ Backend server is online');
      return true;
    } else {
      console.log(`⚠️ Backend server returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(
      `⚠️ Server health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );

    // Try one more time with a different endpoint
    try {
      const statusUrl = API_BASE_URL
        ? `${API_BASE_URL}/api/cluster/status`
        : '/api/cluster/status';
      console.log(`🔍 Trying alternative endpoint ${statusUrl}...`);

      const response = await fetch(statusUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
      });

      if (response.ok) {
        console.log('✅ Backend server is online (second attempt succeeded)');
        return true;
      } else {
        console.log(`⚠️ Second attempt failed with status ${response.status}`);
      }
    } catch (secondError) {
      console.log(
        '❌ Second server health check also failed:',
        secondError instanceof Error ? secondError.message : 'Unknown error'
      );
    }

    // Log helpful debugging information
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Make sure the backend server is running');
    console.log('2. Check if the server is running on the correct port');
    console.log('3. Verify there are no firewall or network issues');
    console.log('4. If using a custom API URL, ensure it is correct');

    return false;
  }
};

// Define the API service with all the methods
export const clusterApi = {
  // Simple test function to verify API connectivity
  testConnection: async (): Promise<boolean> => {
    try {
      console.log('🧪 Testing API connection...');
      const healthUrl = API_BASE_URL ? `${API_BASE_URL}/health` : '/health';
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ API connection test successful:', data);
        return true;
      } else {
        console.log('❌ API connection test failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ API connection test error:', error);
      return false;
    }
  },
  // Deploy an application
  deployApplication: async (
    cluster: string,
    name: string,
    namespace?: string,
    values?: any,
    method?: string,
    version?: string
  ) => {
    try {
      console.log('🚀 Starting application deployment...');

      // Construct the deployment parameters object
      const deploymentParams = {
        cluster_name: cluster,
        app_name: name,
        namespace: namespace || 'default',
        values: values || {},
        deployment_method: method || 'kubectl',
        app_version: version || 'latest',
        environment: 'dev',
      };

      console.log(
        '✅ Deploying application with params:',
        JSON.stringify(deploymentParams, null, 2)
      );

      // Try direct fetch first for more reliable results
      try {
        const deployUrl = API_BASE_URL
          ? `${API_BASE_URL}/api/apps/deploy`
          : '/api/apps/deploy';
        console.log(`📡 Making direct fetch POST to ${deployUrl}`);

        const directResponse = await fetch(deployUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(deploymentParams),
        });

        if (directResponse.ok) {
          const directData = await directResponse.json();
          console.log(
            '✅ DEPLOYMENT RESPONSE (FETCH):',
            JSON.stringify(directData, null, 2)
          );
          return directData;
        } else {
          console.log(
            `❌ Direct deployment fetch failed with status: ${directResponse.status}`
          );
          const errorText = await directResponse.text();
          console.error('Error response:', errorText);
        }
      } catch (directError) {
        console.error(
          '❌ Error with direct deployment fetch:',
          directError instanceof Error ? directError.message : 'Unknown error'
        );
      }

      // Fallback to axios approach
      console.log('📡 Trying axios POST as fallback for deployment');
      const response = await api.post('/api/apps/deploy', deploymentParams);

      if (response.status >= 200 && response.status < 300) {
        console.log(
          '✅ Application deployed successfully (AXIOS):',
          response.data
        );
        return response.data;
      } else {
        console.error('❌ Failed to deploy application:', response.data);
        throw new Error(
          `Failed to deploy application: ${response.data.message || 'Unknown error'}`
        );
      }
    } catch (error: unknown) {
      console.error(
        '❌ Error deploying application:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  },

  // Stop an application
  stopApplication: async (appId: string) => {
    try {
      const online = await isServerOnline();

      if (!online) {
        console.log(
          'Backend server is not available, returning mock success response'
        );
        return {
          success: true,
          message: `Application ${appId} stopped successfully (mock)`,
        };
      }

      console.log(`Attempting to stop application with ID: ${appId}`);

      const response = await api.post(`/api/apps/${appId}/stop`);

      if (response.status >= 200 && response.status < 300) {
        console.log(`Application ${appId} stopped successfully`);
        return response.data;
      } else {
        throw new Error(
          `Failed to stop application: ${response.data.message || 'Unknown error'}`
        );
      }
    } catch (error: unknown) {
      console.error(
        `Error stopping application ${appId}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error; // Re-throw error to be handled by caller
    }
  },

  // Delete an application
  deleteApplication: async (
    appId: string,
    appName?: string,
    clusterName?: string
  ) => {
    try {
      // Ensure we have valid values for logging and display
      const displayAppId = appId || 'unknown';
      const displayAppName = appName || 'unknown';

      console.log(
        `🗑️ Deleting application: ${displayAppName} (${displayAppId}) from cluster: ${clusterName || 'unknown'}`
      );

      // API path can use the ID or name/cluster combination
      let apiPath = `/api/apps/${appId}`;
      if (!appId && appName && clusterName) {
        apiPath = `/api/apps?name=${encodeURIComponent(appName)}&cluster=${encodeURIComponent(clusterName)}`;
      }

      // Try direct fetch first for more reliable results
      try {
        const deleteUrl = API_BASE_URL ? `${API_BASE_URL}${apiPath}` : apiPath;
        console.log(`📡 Making direct DELETE to ${deleteUrl}`);

        const directResponse = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });

        if (directResponse.ok) {
          const directData = await directResponse.json();
          console.log(
            `✅ Application ${displayAppName} deleted successfully (FETCH):`,
            directData
          );

          // Dispatch event to notify other components that an app was deleted
          window.dispatchEvent(
            new CustomEvent('app-deleted', {
              detail: { success: true, appId, appName, clusterName },
            })
          );

          return directData;
        } else {
          console.log(
            `❌ Direct delete fetch failed with status: ${directResponse.status}`
          );
          const errorText = await directResponse.text();
          console.error('Error response:', errorText);
        }
      } catch (directError) {
        console.error(
          '❌ Error with direct delete fetch:',
          directError instanceof Error ? directError.message : 'Unknown error'
        );
      }

      // Fallback to axios approach
      console.log('📡 Trying axios DELETE as fallback');
      const response = await api.delete(apiPath);

      if (response.status >= 200 && response.status < 300) {
        console.log(
          `✅ Application ${displayAppName} deleted successfully (AXIOS):`,
          response.data
        );

        // Dispatch event to notify other components that an app was deleted
        window.dispatchEvent(
          new CustomEvent('app-deleted', {
            detail: { success: true, appId, appName, clusterName },
          })
        );

        return response.data;
      } else {
        console.error(
          `❌ Failed to delete application ${displayAppName}:`,
          response.data
        );
        throw new Error(
          `Failed to delete application: ${response.data.message || 'Unknown error'}`
        );
      }
    } catch (error: unknown) {
      console.error(
        `❌ Error deleting application ${appName || appId || 'unknown'}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );

      // For UX, handle other errors gracefully
      window.dispatchEvent(
        new CustomEvent('app-deleted', {
          detail: {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        })
      );
      throw error;
    }
  },

  // Enhanced delete function that removes ALL related resources
  deleteApplicationWithAllResources: async (
    appId: string,
    appName?: string,
    clusterName?: string,
    namespace?: string
  ) => {
    try {
      const displayAppId = appId || 'unknown';
      const displayAppName = appName || 'unknown';
      const displayCluster = clusterName || 'unknown';
      const displayNamespace = namespace || 'default';

      console.log(
        `🗑️ Starting comprehensive deletion of application: ${displayAppName} (${displayAppId})`
      );
      console.log(
        `📍 Target: cluster=${displayCluster}, namespace=${displayNamespace}`
      );

      const deletionResults = {
        success: true,
        deletedResources: [] as string[],
        failedResources: [] as string[],
        errors: [] as string[],
      };

      // Try direct fetch first for comprehensive deletion
      try {
        const deleteAllUrl = API_BASE_URL
          ? `${API_BASE_URL}/api/apps/${appId}/delete-all`
          : `/api/apps/${appId}/delete-all`;
        console.log(
          `📡 Making comprehensive DELETE request to ${deleteAllUrl}`
        );

        const directResponse = await fetch(deleteAllUrl, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            cluster_name: clusterName,
            namespace: namespace,
            app_name: appName,
            delete_all_resources: true,
          }),
        });

        if (directResponse.ok) {
          const directData = await directResponse.json();
          console.log(
            `✅ Comprehensive deletion completed (FETCH):`,
            directData
          );

          // Dispatch event to notify other components
          window.dispatchEvent(
            new CustomEvent('app-deleted', {
              detail: {
                success: true,
                appId,
                appName,
                clusterName,
                comprehensive: true,
                results: directData,
              },
            })
          );

          return directData;
        } else {
          console.log(
            `❌ Comprehensive delete failed with status: ${directResponse.status}`
          );
          const errorText = await directResponse.text();
          console.error('Error response:', errorText);
        }
      } catch (directError) {
        console.error(
          '❌ Error with comprehensive delete:',
          directError instanceof Error ? directError.message : 'Unknown error'
        );
      }

      // Fallback: Try regular delete if comprehensive delete is not available
      console.log('📡 Falling back to regular delete');
      const fallbackResult = await clusterApi.deleteApplication(
        appId,
        appName,
        clusterName
      );

      return {
        success: true,
        message: `Application ${displayAppName} deleted (fallback method)`,
        fallback: true,
        result: fallbackResult,
      };
    } catch (error: unknown) {
      console.error(
        `❌ Error in comprehensive deletion:`,
        error instanceof Error ? error.message : 'Unknown error'
      );

      // Dispatch failure event
      window.dispatchEvent(
        new CustomEvent('app-deleted', {
          detail: {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            comprehensive: true,
          },
        })
      );

      throw error;
    }
  },

  getClusterStatus: async (): Promise<ClusterStatus> => {
    try {
      console.log('🔍 Fetching cluster status from backend...');

      // Skip server online check and make API call directly
      console.log('✅ Making direct API call to fetch cluster status...');

      // Try to get clusters directly first
      try {
        console.log('Attempting to get clusters directly first...');
        const clusters = await clusterApi.listClusters();

        if (clusters && clusters.length > 0) {
          console.log(
            `✅ Successfully retrieved ${clusters.length} clusters directly`
          );

          // Calculate node count from clusters
          const nodeCount = clusters.reduce(
            (acc: number, cluster: any) => acc + (cluster.nodes || 0),
            0
          );

          const formattedData = {
            cluster_count: clusters.length,
            node_count: nodeCount,
            cpu_usage: 0, // We don't have this info from listClusters
            clusters: clusters,
          };

          console.log(
            'FORMATTED CLUSTER STATUS (DIRECT LIST):',
            JSON.stringify(formattedData, null, 2)
          );
          return formattedData;
        } else {
          console.log(
            'No clusters found from direct list, trying status endpoint...'
          );
        }
      } catch (listError) {
        console.error(
          'Error listing clusters directly:',
          listError instanceof Error ? listError.message : 'Unknown error'
        );
        console.log('Falling back to status endpoint...');
      }

      // Direct fetch approach for more reliable results
      try {
        console.log(
          `Making direct fetch to ${API_BASE_URL}/api/cluster/status`
        );
        const directResponse = await fetch(
          `${API_BASE_URL}/api/cluster/status?_=${Date.now()}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (directResponse.ok) {
          const directData = await directResponse.json();
          console.log(
            'DIRECT FETCH RESPONSE:',
            JSON.stringify(directData, null, 2)
          );

          // Handle the backend response format: { status, message, data: { clusters, cluster_count, etc } }
          let clusters = [];
          let clusterCount = 0;
          let nodeCount = 0;
          let cpuUsage = 0;

          // The backend returns data in the format: { status: "success", data: { clusters: [...], cluster_count: N } }
          if (directData.data && typeof directData.data === 'object') {
            clusters = directData.data.clusters || [];
            clusterCount = directData.data.cluster_count || clusters.length;
            nodeCount = directData.data.node_count || 0;
            cpuUsage = directData.data.cpu_usage || 0;
          } else if (directData.clusters) {
            // Fallback: direct clusters array (for other API formats)
            clusters = directData.clusters;
            clusterCount = directData.cluster_count || clusters.length;
            nodeCount = directData.node_count || 0;
            cpuUsage = directData.cpu_usage || 0;
          }

          // If we still don't have node count but have clusters with node info
          if (nodeCount === 0 && clusters.length > 0) {
            nodeCount = clusters.reduce(
              (acc: number, cluster: any) => acc + (cluster.nodes || 0),
              0
            );
          }

          const formattedData = {
            cluster_count: clusterCount,
            node_count: nodeCount,
            cpu_usage: cpuUsage,
            clusters: clusters,
          };

          console.log(
            'FORMATTED CLUSTER STATUS (DIRECT):',
            JSON.stringify(formattedData, null, 2)
          );
          console.log(
            '✅ Returning REAL cluster data with',
            formattedData.clusters.length,
            'clusters'
          );
          return formattedData;
        } else {
          console.log(
            '❌ Direct fetch failed with status:',
            directResponse.status
          );
        }
      } catch (directError) {
        console.error(
          '❌ Error with direct fetch:',
          directError instanceof Error ? directError.message : 'Unknown error'
        );
      }

      // Fallback to axios approach
      try {
        console.log('Trying axios approach as fallback');
        const response = await api.get('/api/cluster/status', {
          params: {
            _: Date.now(), // Add cache busting parameter
          },
        });

        // Debug: Log the raw response data
        console.log(
          'RAW API RESPONSE (AXIOS):',
          JSON.stringify(response.data, null, 2)
        );

        if (response.data) {
          console.log('✅ Successfully fetched cluster status from API');

          // Handle the backend response format: { status, message, data: { clusters, cluster_count, etc } }
          let clusters = [];
          let clusterCount = 0;
          let nodeCount = 0;
          let cpuUsage = 0;

          // The backend returns data in the format: { status: "success", data: { clusters: [...], cluster_count: N } }
          if (response.data.data && typeof response.data.data === 'object') {
            clusters = response.data.data.clusters || [];
            clusterCount = response.data.data.cluster_count || clusters.length;
            nodeCount = response.data.data.node_count || 0;
            cpuUsage = response.data.data.cpu_usage || 0;
          } else if (response.data.clusters) {
            // Fallback: direct clusters array (for other API formats)
            clusters = response.data.clusters;
            clusterCount = response.data.cluster_count || clusters.length;
            nodeCount = response.data.node_count || 0;
            cpuUsage = response.data.cpu_usage || 0;
          }

          // If we still don't have node count but have clusters with node info
          if (nodeCount === 0 && clusters.length > 0) {
            nodeCount = clusters.reduce(
              (acc: number, cluster: any) => acc + (cluster.nodes || 0),
              0
            );
          }

          const formattedData = {
            cluster_count: clusterCount,
            node_count: nodeCount,
            cpu_usage: cpuUsage,
            clusters: clusters,
          };

          console.log(
            'FORMATTED CLUSTER STATUS (AXIOS):',
            JSON.stringify(formattedData, null, 2)
          );
          console.log(
            '✅ Returning REAL cluster data with',
            formattedData.clusters.length,
            'clusters'
          );
          return formattedData;
        }
      } catch (apiError) {
        console.error(
          '❌ Error fetching cluster status from API:',
          apiError instanceof Error ? apiError.message : 'Unknown error'
        );
      }

      // Return empty data if all API calls fail
      console.log('⚠️ All API calls failed, returning empty data');
      return { cluster_count: 0, node_count: 0, cpu_usage: 0, clusters: [] };
    } catch (error: unknown) {
      console.error(
        'Error in getClusterStatus:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      // Return empty data on error
      return { cluster_count: 0, node_count: 0, cpu_usage: 0, clusters: [] };
    }
  },

  // Add a dedicated method to list clusters
  listClusters: async (): Promise<Cluster[]> => {
    try {
      console.log('🔍 Fetching clusters from backend...');

      // Make direct API call without server online check
      try {
        console.log('🔄 Making direct API call to cluster status endpoint...');
        const response = await api.get('/api/cluster/status');

        if (
          response.data &&
          response.data.data &&
          response.data.data.clusters &&
          Array.isArray(response.data.data.clusters)
        ) {
          console.log(
            `✅ Found ${response.data.data.clusters.length} clusters from status endpoint`
          );
          return response.data.data.clusters;
        }
      } catch (statusError) {
        console.error(
          'Error getting clusters from status endpoint:',
          statusError
        );
      }

      // Fallback to dedicated clusters list endpoint
      try {
        console.log('🔄 Trying dedicated clusters list endpoint...');
        const response = await api.get('/api/clusters/list');

        if (response.data && Array.isArray(response.data)) {
          console.log(
            `✅ Found ${response.data.length} clusters from dedicated endpoint`
          );
          return response.data;
        } else if (
          response.data &&
          response.data.data &&
          Array.isArray(response.data.data)
        ) {
          console.log(
            `✅ Found ${response.data.data.length} clusters from nested data property`
          );
          return response.data.data;
        }
      } catch (listError) {
        console.error(
          'Error with dedicated clusters list endpoint:',
          listError
        );
      }

      // Try fallback with fetch API
      try {
        console.log('🔄 Trying fallback fetch API for cluster status...');
        const fallbackResponse = await fetch(
          `${API_BASE_URL}/api/cluster/status`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          }
        );

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          console.log(
            '✅ Fallback cluster status fetch successful:',
            fallbackData
          );

          if (
            fallbackData &&
            fallbackData.data &&
            fallbackData.data.clusters &&
            Array.isArray(fallbackData.data.clusters)
          ) {
            console.log(
              `✅ Found ${fallbackData.data.clusters.length} clusters from fallback fetch`
            );
            return fallbackData.data.clusters;
          }
        }
      } catch (fallbackError) {
        console.error('❌ Fallback fetch also failed:', fallbackError);
      }

      console.log('⚠️ No clusters found from any endpoint');
      return [];
    } catch (error: unknown) {
      console.error(
        '❌ Error listing clusters:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return [];
    }
  },

  getApplications: async (
    includeSystemComponents: boolean = false
  ): Promise<Application[]> => {
    try {
      console.log('🔍 Fetching applications from backend...');

      // Make direct API call without server online check for better reliability
      console.log('✅ Making direct API call to fetch applications...');

      // Try direct fetch first for more reliable results
      try {
        console.log(`Making direct fetch to ${API_BASE_URL}/api/apps/list`);
        const directResponse = await fetch(
          `${API_BASE_URL}/api/apps/list?include_system_components=${includeSystemComponents}&_=${Date.now()}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          }
        );

        if (directResponse.ok) {
          const directData = await directResponse.json();
          console.log(
            'DIRECT FETCH APPLICATIONS RESPONSE:',
            JSON.stringify(directData, null, 2)
          );

          // Handle the backend response format: { status, message, data: [...] }
          let applications = [];

          if (directData.data && Array.isArray(directData.data)) {
            applications = directData.data;
          } else if (Array.isArray(directData)) {
            applications = directData;
          }

          console.log(
            `✅ Found ${applications.length} applications from direct fetch`
          );
          return applications;
        } else {
          console.log(
            '❌ Direct fetch failed with status:',
            directResponse.status
          );
        }
      } catch (directError) {
        console.error(
          '❌ Error with direct fetch:',
          directError instanceof Error ? directError.message : 'Unknown error'
        );
      }

      // Fallback to axios approach
      console.log('Trying axios approach as fallback for applications');
      const response = await api.get('/api/apps/list', {
        params: {
          include_system_components: includeSystemComponents,
          _: Date.now(), // Add cache busting parameter
        },
      });

      if (response.data && Array.isArray(response.data)) {
        console.log('✅ Fetched applications from API (axios):', response.data);
        return response.data;
      } else if (
        response.data &&
        response.data.data &&
        Array.isArray(response.data.data)
      ) {
        console.log(
          '✅ Fetched applications from nested data property (axios):',
          response.data.data
        );
        return response.data.data;
      } else {
        console.log('⚠️ API did not return a valid array of applications');
        return [];
      }
    } catch (error: unknown) {
      console.error(
        'Error in getApplications:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      // Return empty array if there's an error
      return [];
    }
  },

  // Manage application (start, stop, restart)
  manageApplication: async (
    appId: string,
    action: string,
    cluster: string = 'default',
    namespace: string = 'default'
  ) => {
    try {
      const online = await isServerOnline();

      if (!online) {
        throw new Error('Backend server is not available');
      }

      console.log(
        `Managing application ${appId}: ${action} in cluster ${cluster}, namespace ${namespace}`
      );

      const response = await api.post(`/api/apps/${appId}/action`, {
        action,
        cluster_name: cluster,
        namespace,
      });

      if (response.status >= 200 && response.status < 300) {
        console.log(
          `Application ${action} completed successfully:`,
          response.data
        );
        return response.data;
      } else {
        throw new Error(
          `Failed to ${action} application: ${response.data.message || 'Unknown error'}`
        );
      }
    } catch (error: unknown) {
      console.error(
        `Error ${action} application ${appId}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  },

  // Scale application
  scaleApplication: async (
    appId: string,
    replicas: number,
    cluster: string = 'default',
    namespace: string = 'default'
  ) => {
    try {
      const online = await isServerOnline();

      if (!online) {
        throw new Error('Backend server is not available');
      }

      console.log(
        `Scaling application ${appId} to ${replicas} replicas in cluster ${cluster}, namespace ${namespace}`
      );

      const response = await api.post(`/api/apps/${appId}/scale`, {
        replicas,
        cluster_name: cluster,
        namespace,
      });

      if (response.status >= 200 && response.status < 300) {
        console.log(`Application scaled successfully:`, response.data);
        return response.data;
      } else {
        throw new Error(
          `Failed to scale application: ${response.data.message || 'Unknown error'}`
        );
      }
    } catch (error: unknown) {
      console.error(
        `Error scaling application ${appId}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  },

  // Get application details
  getApplicationDetails: async (
    appId: string,
    cluster: string = 'default',
    namespace: string = 'default'
  ) => {
    try {
      const online = await isServerOnline();

      if (!online) {
        throw new Error('Backend server is not available');
      }

      console.log(
        `Fetching details for application ${appId} in cluster ${cluster}, namespace ${namespace}`
      );

      const response = await api.get(`/api/apps/${appId}/details`, {
        params: { cluster_name: cluster, namespace },
      });

      if (response.status >= 200 && response.status < 300) {
        console.log(`Application details fetched successfully:`, response.data);
        return response;
      } else {
        throw new Error(
          `Failed to fetch application details: ${response.data.message || 'Unknown error'}`
        );
      }
    } catch (error: unknown) {
      console.error(
        `Error fetching details for application ${appId}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  },

  // Get application logs
  getApplicationLogs: async (
    appId: string,
    cluster: string = 'default',
    namespace: string = 'default',
    lines: number = 100
  ) => {
    try {
      const online = await isServerOnline();

      if (!online) {
        throw new Error('Backend server is not available');
      }

      console.log(
        `Fetching logs for application ${appId} in cluster ${cluster}, namespace ${namespace} (${lines} lines)`
      );

      const response = await api.get(`/api/apps/${appId}/logs`, {
        params: { cluster_name: cluster, namespace, lines },
      });

      if (response.status >= 200 && response.status < 300) {
        console.log(`Application logs fetched successfully`);
        return response;
      } else {
        throw new Error(
          `Failed to fetch application logs: ${response.data.message || 'Unknown error'}`
        );
      }
    } catch (error: unknown) {
      console.error(
        `Error fetching logs for application ${appId}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  },

  // Get application metrics
  getApplicationMetrics: async (
    appId: string,
    cluster: string = 'default',
    namespace: string = 'default'
  ) => {
    try {
      const online = await isServerOnline();

      if (!online) {
        throw new Error('Backend server is not available');
      }

      console.log(
        `Fetching metrics for application ${appId} in cluster ${cluster}, namespace ${namespace}`
      );

      const response = await api.get(`/api/apps/${appId}/metrics`, {
        params: { cluster_name: cluster, namespace },
      });

      if (response.status >= 200 && response.status < 300) {
        console.log(`Application metrics fetched successfully:`, response.data);
        return response;
      } else {
        throw new Error(
          `Failed to fetch application metrics: ${response.data.message || 'Unknown error'}`
        );
      }
    } catch (error: unknown) {
      console.error(
        `Error fetching metrics for application ${appId}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  },

  // Start port forwarding for an application
  startPortForward: async (
    appId: string,
    cluster: string,
    namespace: string = 'default',
    localPort?: number
  ) => {
    try {
      const online = await isServerOnline();

      if (!online) {
        throw new Error('Backend server is not available');
      }

      console.log(
        `Starting port forwarding for application ${appId} in cluster ${cluster}, namespace ${namespace}`
      );

      const response = await api.post(`/api/apps/${appId}/port-forward`, {
        app_id: appId,
        cluster_name: cluster,
        namespace,
        local_port: localPort,
      });

      if (response.status >= 200 && response.status < 300) {
        console.log(`Port forwarding started successfully:`, response.data);
        return response.data;
      } else {
        throw new Error(
          `Failed to start port forwarding: ${response.data.message || 'Unknown error'}`
        );
      }
    } catch (error: unknown) {
      console.error(
        `Error starting port forwarding for ${appId}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  },

  // Stop port forwarding for an application
  stopPortForward: async (
    appId: string,
    cluster: string,
    namespace: string = 'default'
  ) => {
    try {
      const online = await isServerOnline();

      if (!online) {
        throw new Error('Backend server is not available');
      }

      console.log(
        `Stopping port forwarding for application ${appId} in cluster ${cluster}, namespace ${namespace}`
      );

      const response = await api.delete(`/api/apps/${appId}/port-forward`, {
        params: { cluster_name: cluster, namespace },
      });

      if (response.status >= 200 && response.status < 300) {
        console.log(`Port forwarding stopped successfully:`, response.data);
        return response.data;
      } else {
        throw new Error(
          `Failed to stop port forwarding: ${response.data.message || 'Unknown error'}`
        );
      }
    } catch (error: unknown) {
      console.error(
        `Error stopping port forwarding for ${appId}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  },

  // Get port forwarding status for an application
  getPortForwardStatus: async (
    appId: string,
    cluster: string,
    namespace: string = 'default'
  ) => {
    try {
      const online = await isServerOnline();

      if (!online) {
        throw new Error('Backend server is not available');
      }

      const response = await api.get(`/api/apps/${appId}/port-forward/status`, {
        params: { cluster_name: cluster, namespace },
      });

      if (response.status >= 200 && response.status < 300) {
        return response.data;
      } else {
        throw new Error(
          `Failed to get port forwarding status: ${response.data.message || 'Unknown error'}`
        );
      }
    } catch (error: unknown) {
      console.error(
        `Error getting port forwarding status for ${appId}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  },

  // Get configuration for a Kind cluster
  getKindConfig: async (clusterName: string): Promise<any> => {
    try {
      const online = await isServerOnline();

      if (!online) {
        console.log(
          'Backend server is not available, returning default cluster config'
        );
        return {
          data: {
            kind: 'Cluster',
            apiVersion: 'kind.x-k8s.io/v1alpha4',
            name: clusterName,
            nodes: [{ role: 'control-plane' }, { role: 'worker' }],
          },
          status: 'success',
        };
      }

      console.log(`Fetching configuration for cluster ${clusterName}...`);

      // Try direct fetch first for more reliable results
      try {
        const directResponse = await fetch(
          `${API_BASE_URL}/api/cluster/${clusterName}/config`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (directResponse.ok) {
          const directData = await directResponse.json();
          console.log(
            'DIRECT CONFIG RESPONSE:',
            JSON.stringify(directData, null, 2)
          );

          if (directData.data) {
            console.log('✅ Successfully fetched cluster config directly');
            return directData;
          }
          return { data: directData, status: 'success' };
        } else {
          console.log(
            `❌ Direct config fetch failed with status: ${directResponse.status}`
          );
        }
      } catch (directError) {
        console.error(
          '❌ Error with direct config fetch:',
          directError instanceof Error ? directError.message : 'Unknown error'
        );
      }

      // Fallback to axios
      console.log('Trying axios approach as fallback for config');
      const response = await api.get(`/api/cluster/${clusterName}/config`);

      if (response.status >= 200 && response.status < 300 && response.data) {
        console.log('✅ Successfully fetched cluster config via axios');
        if (response.data.data) {
          return response.data;
        }
        return { data: response.data, status: 'success' };
      } else {
        throw new Error(
          `Failed to get cluster config: ${response.data?.message || 'Unknown error'}`
        );
      }
    } catch (error: unknown) {
      console.error(
        `Error getting cluster config for ${clusterName}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      // Return basic cluster config
      console.log('⚠️ Error fetching config, returning default config');
      return {
        data: {
          kind: 'Cluster',
          apiVersion: 'kind.x-k8s.io/v1alpha4',
          name: clusterName,
          nodes: [{ role: 'control-plane' }, { role: 'worker' }],
        },
        status: 'success',
      };
    }
  },

  // Create a new Kind cluster
  createCluster: async (
    clusterName: string,
    environment: string,
    workerNodes: number,
    controlPlaneNodes: number = 1,
    config: any = {}
  ): Promise<any> => {
    try {
      console.log('🚀 CREATE CLUSTER CALLED with params:', {
        clusterName,
        environment,
        workerNodes,
        controlPlaneNodes,
        config,
      });

      const online = await isServerOnline();

      if (!online) {
        console.log(
          '⚠️ Backend server is not available, returning mock success response'
        );
        return {
          success: true,
          message: `Cluster ${clusterName} created successfully (mock)`,
          cluster: {
            name: clusterName,
            status: 'Running',
            nodes: workerNodes + controlPlaneNodes,
            created: new Date().toISOString(),
          },
        };
      }

      console.log(
        `📝 Creating cluster ${clusterName} with ${workerNodes} worker nodes and ${controlPlaneNodes} control plane nodes`
      );
      console.log('📝 Advanced config:', JSON.stringify(config, null, 2));

      // Prepare the request payload according to the backend's expected format
      const requestPayload: any = {
        name: clusterName,
        environment: environment,
        worker_nodes: workerNodes,
        apply_resource_limits: true,
      };

      // Add worker_config if provided
      if (config && config.worker_config) {
        requestPayload.worker_config = {
          cpu: config.worker_config.cpu,
          memory: config.worker_config.memory,
        };
      }

      // Add control_plane_config if provided
      if (config && config.control_plane_config) {
        requestPayload.control_plane_config = {
          cpu: config.control_plane_config.cpu,
          memory: config.control_plane_config.memory,
        };
      }

      // Add apply_resource_limits if provided
      if (config && config.apply_resource_limits !== undefined) {
        requestPayload.apply_resource_limits = config.apply_resource_limits;
      }

      console.log(
        '📤 Sending request payload to /api/cluster/create:',
        JSON.stringify(requestPayload, null, 2)
      );

      // Try with fetch first for more reliable results
      try {
        console.log(
          `📡 Making direct fetch POST to ${API_BASE_URL}/api/cluster/create`
        );

        const directResponse = await fetch(
          `${API_BASE_URL}/api/cluster/create`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify(requestPayload),
          }
        );

        if (directResponse.ok) {
          const directData = await directResponse.json();
          console.log(
            '✅ CREATE RESPONSE (FETCH):',
            JSON.stringify(directData, null, 2)
          );

          // Check if we got a task ID for tracking
          let taskId = null;

          // Try different possible locations for the task_id in the response
          if (directData && directData.data && directData.data.task_id) {
            taskId = directData.data.task_id;
          } else if (directData && directData.task_id) {
            taskId = directData.task_id;
          } else if (directData && typeof directData === 'object') {
            // Search for task_id in any property of the response
            for (const key in directData) {
              if (
                typeof directData[key] === 'object' &&
                directData[key] &&
                directData[key].task_id
              ) {
                taskId = directData[key].task_id;
                break;
              }
            }
          }

          if (taskId) {
            console.log(`🔑 Got task ID for tracking: ${taskId}`);

            // Return with task ID for tracking
            return {
              success: true,
              message: `Cluster creation initiated for ${clusterName}`,
              task_id: taskId,
              status: 'pending',
              cluster_name: clusterName,
            };
          } else {
            console.log(
              '⚠️ No task ID found in direct response, returning full response'
            );
            return directData;
          }
        } else {
          console.log(
            `❌ Direct POST failed with status: ${directResponse.status}`
          );
          const errorText = await directResponse.text();
          console.error('Error response:', errorText);
        }
      } catch (directError) {
        console.error(
          '❌ Error with direct POST fetch:',
          directError instanceof Error ? directError.message : 'Unknown error'
        );
      }

      // Fallback to axios
      console.log('📡 Trying axios POST as fallback');
      const response = await api.post('/api/cluster/create', requestPayload);

      if (response.status >= 200 && response.status < 300) {
        console.log(
          '✅ Cluster creation initiated successfully (AXIOS):',
          response.data
        );

        // Log the full response structure to help debug
        console.log(
          '📊 Full response structure:',
          JSON.stringify(response.data, null, 2)
        );

        // Check if we got a task ID for tracking - handle different response formats
        let taskId = null;

        // Try different possible locations for the task_id in the response
        if (response.data && response.data.data && response.data.data.task_id) {
          taskId = response.data.data.task_id;
        } else if (response.data && response.data.task_id) {
          taskId = response.data.task_id;
        } else if (response.data && typeof response.data === 'object') {
          // Search for task_id in any property of the response
          for (const key in response.data) {
            if (
              typeof response.data[key] === 'object' &&
              response.data[key] &&
              response.data[key].task_id
            ) {
              taskId = response.data[key].task_id;
              break;
            }
          }
        }

        if (taskId) {
          console.log(`🔑 Got task ID for tracking: ${taskId}`);

          // Start polling for task status
          return {
            success: true,
            message: `Cluster creation initiated for ${clusterName}`,
            task_id: taskId,
            status: 'pending',
            cluster_name: clusterName,
          };
        } else {
          console.log(
            '⚠️ No task ID found in response, returning full response'
          );
        }

        return response.data;
      } else {
        throw new Error(
          `Failed to create cluster: ${response.data.message || 'Unknown error'}`
        );
      }
    } catch (error: unknown) {
      console.error(
        `❌ Error creating cluster ${clusterName}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  },

  // Get application templates
  getAppTemplates: async () => {
    try {
      console.log('🔍 Fetching app templates from backend...');

      // Make the API call directly without server online check
      const response = await api.get('/api/apps/templates');

      console.log('✅ App templates response:', response.status, response.data);

      if (response.status >= 200 && response.status < 300) {
        if (Array.isArray(response.data)) {
          console.log(
            `📦 Found ${response.data.length} templates (direct array)`
          );
          return response.data;
        } else if (
          response.data &&
          response.data.data &&
          Array.isArray(response.data.data)
        ) {
          console.log(
            `📦 Found ${response.data.data.length} templates (nested data)`
          );
          return response.data.data;
        }
        console.log('⚠️ No templates found in response');
        return [];
      } else {
        throw new Error(
          `Failed to get app templates: ${response.data.message || 'Unknown error'}`
        );
      }
    } catch (error: unknown) {
      console.error(
        '❌ Error getting app templates:',
        error instanceof Error ? error.message : 'Unknown error'
      );

      // Try fallback with fetch API
      try {
        console.log('🔄 Trying fallback fetch API...');
        const fallbackResponse = await fetch(
          `${API_BASE_URL}/api/apps/templates`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          }
        );

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          console.log('✅ Fallback fetch successful:', fallbackData);

          if (Array.isArray(fallbackData)) {
            return fallbackData;
          } else if (
            fallbackData &&
            fallbackData.data &&
            Array.isArray(fallbackData.data)
          ) {
            return fallbackData.data;
          }
        }
      } catch (fallbackError) {
        console.error('❌ Fallback fetch also failed:', fallbackError);
      }

      return [];
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
        console.log(
          'Backend server is not available, returning mock success response'
        );
        return {
          success: true,
          message: `Resource limits updated successfully for ${clusterName} (mock)`,
        };
      }

      console.log(`Setting resource limits for cluster ${clusterName}:`, {
        workerCpu,
        workerMemory,
        controlPlaneCpu,
        controlPlaneMemory,
      });

      // Use the standardized endpoint
      const response = await api.post(
        `/api/cluster/${clusterName}/set-resource-limits`,
        {
          worker_config: {
            cpu: workerCpu.toString(),
            memory: workerMemory,
          },
          control_plane_config: {
            cpu: controlPlaneCpu.toString(),
            memory: controlPlaneMemory,
          },
        }
      );

      if (response.status >= 200 && response.status < 300) {
        console.log('Resource limits updated successfully:', response.data);
        return response.data;
      } else {
        throw new Error(
          `Failed to update resource limits: ${response.data.message || 'Unknown error'}`
        );
      }
    } catch (error: unknown) {
      console.error(
        `Error setting resource limits for ${clusterName}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  },

  getClusterTaskStatus: async (taskId: string) => {
    try {
      const online = await isServerOnline();

      if (!online) {
        console.log(
          'Backend server is not available, returning mock task status'
        );
        return {
          task_id: taskId,
          status: 'completed',
          completed: true,
          success: true,
          message: 'Task completed successfully (mock)',
          result: {},
        };
      }

      // First try with fetch API for more reliable results
      try {
        console.log(`Fetching task status for ${taskId} using fetch API`);
        const directResponse = await fetch(
          `${API_BASE_URL}/api/tasks/${taskId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          }
        );

        if (directResponse.ok) {
          const directData = await directResponse.json();
          console.log(`Task status for ${taskId}:`, directData);
          return directData;
        } else {
          console.log(
            `Failed to get task status with fetch: ${directResponse.status}`
          );
        }
      } catch (fetchError) {
        console.error(
          'Error with fetch API:',
          fetchError instanceof Error ? fetchError.message : 'Unknown error'
        );
      }

      // Fallback to axios
      console.log(`Fetching task status for ${taskId} using axios`);
      const response = await api.get(`/api/tasks/${taskId}`);

      if (response.status >= 200 && response.status < 300) {
        console.log(`Task status for ${taskId} (axios):`, response.data);
        return response.data;
      } else {
        throw new Error(
          `Failed to get task status: ${response.data.message || 'Unknown error'}`
        );
      }
    } catch (error: any) {
      console.error(
        `Error getting task status for ${taskId}:`,
        error?.message || 'Unknown error'
      );

      // If we get a 404, the task doesn't exist
      if (error?.response?.status === 404 || error?.message?.includes('404')) {
        return {
          task_id: taskId,
          status: 'not_found',
          message: `Task ${taskId} not found`,
          completed: true,
          success: false,
          error: 'Task not found',
        };
      }

      return {
        task_id: taskId,
        status: 'error',
        message: error?.message || 'Unknown error occurred',
        completed: true,
        success: false,
        result: {},
      };
    }
  },

  // Poll for task status with timeout and callback
  pollTaskStatus: async (
    taskId: string,
    onUpdate: (status: any) => void,
    onComplete: (status: any) => void,
    onError: (error: any) => void,
    intervalMs: number = 2000,
    timeoutMs: number = 300000 // 5 minutes default timeout
  ) => {
    console.log(
      `Starting to poll task ${taskId} status every ${intervalMs}ms with ${timeoutMs}ms timeout`
    );

    const startTime = Date.now();
    let lastStatus: any = null;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;

    const poll = async () => {
      try {
        // Check if we've exceeded the timeout
        if (Date.now() - startTime > timeoutMs) {
          console.error(`Polling timeout exceeded for task ${taskId}`);
          onError(
            new Error(
              `Timeout exceeded while waiting for task ${taskId} to complete`
            )
          );
          return;
        }

        // Get the current status
        const status = await clusterApi.getClusterTaskStatus(taskId);

        // Reset consecutive errors counter on successful API call
        consecutiveErrors = 0;

        // Only call onUpdate if the status has changed
        if (JSON.stringify(status) !== JSON.stringify(lastStatus)) {
          console.log(`Task ${taskId} status updated:`, status);
          lastStatus = status;
          onUpdate(status);
        }

        // Check if the task is completed
        if (
          status.completed ||
          status.status === 'completed' ||
          status.status === 'failed'
        ) {
          console.log(`Task ${taskId} completed with status: ${status.status}`);

          // If task failed but cluster might exist, check directly
          if (status.status === 'failed' && status.cluster_name) {
            try {
              console.log(
                `Task failed but checking if cluster ${status.cluster_name} exists anyway...`
              );
              const clusters = await clusterApi.listClusters();
              const clusterExists = clusters.some(
                c => c.name === status.cluster_name
              );

              if (clusterExists) {
                console.log(
                  `Cluster ${status.cluster_name} exists despite task failure`
                );
                status.success = true;
                status.status = 'completed';
                status.message = `Cluster ${status.cluster_name} created successfully (verified by direct check)`;
              }
            } catch (checkError) {
              console.error('Error checking cluster existence:', checkError);
            }
          }

          onComplete(status);
          return;
        }

        // Schedule the next poll
        setTimeout(poll, intervalMs);
      } catch (error) {
        console.error(`Error polling task ${taskId} status:`, error);

        // Increment consecutive errors counter
        consecutiveErrors++;

        if (consecutiveErrors >= maxConsecutiveErrors) {
          console.error(
            `Too many consecutive errors (${consecutiveErrors}), stopping polling`
          );
          onError(error);
          return;
        }

        // If we get errors but haven't reached the limit, continue polling
        setTimeout(poll, intervalMs);
      }
    };

    // Start polling
    poll();
  },

  // Delete a cluster
  deleteCluster: async (clusterName: string): Promise<any> => {
    try {
      console.log(`🗑️ Attempting to delete cluster: ${clusterName}`);

      const online = await isServerOnline();

      if (!online) {
        console.log(
          'Backend server is not available, returning mock success response'
        );
        return {
          success: true,
          message: `Cluster ${clusterName} deleted successfully (mock)`,
          cluster_name: clusterName,
        };
      }

      // Use direct subprocess call to delete the cluster
      try {
        console.log(
          `Making direct DELETE call to delete cluster: ${clusterName}`
        );

        // Use the subprocess endpoint which is more reliable
        const directResponse = await fetch(
          `${API_BASE_URL}/api/cluster/delete-direct`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({ cluster_name: clusterName }),
          }
        );

        if (directResponse.ok) {
          const directData = await directResponse.json();
          console.log(
            '✅ DELETE RESPONSE (DIRECT):',
            JSON.stringify(directData, null, 2)
          );
          return directData;
        } else {
          console.log(
            `❌ Direct DELETE failed with status: ${directResponse.status}`
          );
          const errorText = await directResponse.text();
          console.error('Error response:', errorText);
        }
      } catch (directError) {
        console.error(
          '❌ Error with direct DELETE call:',
          directError instanceof Error ? directError.message : 'Unknown error'
        );
      }

      // Fallback to standard DELETE endpoint
      try {
        console.log(`Trying standard DELETE endpoint for ${clusterName}`);
        const response = await api.delete(`/api/cluster/${clusterName}`);

        if (response.status >= 200 && response.status < 300) {
          console.log(
            '✅ Cluster deleted successfully (STANDARD):',
            response.data
          );
          return response.data;
        } else {
          throw new Error(
            `Failed to delete cluster: ${response.data?.message || 'Unknown error'}`
          );
        }
      } catch (standardError) {
        console.error(
          '❌ Error with standard DELETE endpoint:',
          standardError instanceof Error
            ? standardError.message
            : 'Unknown error'
        );
      }

      // Last resort: Use direct kind command via subprocess endpoint
      console.log(
        `Trying subprocess endpoint as last resort for ${clusterName}`
      );
      const subprocessResponse = await api.post('/api/subprocess/execute', {
        command: 'kind',
        args: ['delete', 'cluster', '--name', clusterName],
      });

      if (subprocessResponse.status >= 200 && subprocessResponse.status < 300) {
        console.log(
          '✅ Cluster deleted successfully (SUBPROCESS):',
          subprocessResponse.data
        );
        return {
          success: true,
          message: `Cluster ${clusterName} deleted successfully via subprocess`,
          cluster_name: clusterName,
          details: subprocessResponse.data,
        };
      } else {
        throw new Error(
          `All deletion methods failed for cluster ${clusterName}`
        );
      }
    } catch (error: unknown) {
      console.error(
        `Error deleting cluster ${clusterName}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  },
};

// Storage Management API
export const storageApi = {
  // Get storage overview across all clusters
  getStorageOverview: async () => {
    const response = await api.get('/api/storage/overview');
    return response.data;
  },

  // Get storage classes
  getStorageClasses: async (cluster?: string) => {
    const params = cluster ? { cluster } : {};
    const response = await api.get('/api/storage/classes', { params });
    return response.data;
  },

  // Get persistent volumes
  getPersistentVolumes: async (cluster?: string) => {
    const params = cluster ? { cluster } : {};
    const response = await api.get('/api/storage/persistent-volumes', {
      params,
    });
    return response.data;
  },

  // Get persistent volume claims
  getPersistentVolumeClaims: async (cluster?: string, namespace?: string) => {
    const params: any = {};
    if (cluster) params.cluster = cluster;
    if (namespace) params.namespace = namespace;
    const response = await api.get('/api/storage/persistent-volume-claims', {
      params,
    });
    return response.data;
  },

  // Get storage metrics
  getStorageMetrics: async (cluster?: string) => {
    const params = cluster ? { cluster } : {};
    const response = await api.get('/api/storage/metrics', { params });
    return response.data;
  },

  // Get storage events
  getStorageEvents: async (cluster?: string, limit?: number) => {
    const params: any = {};
    if (cluster) params.cluster = cluster;
    if (limit) params.limit = limit;
    const response = await api.get('/api/storage/events', { params });
    return response.data;
  },

  // Delete persistent volume
  deletePersistentVolume: async (cluster: string, name: string) => {
    const response = await api.delete(
      `/api/storage/persistent-volumes/${name}`,
      {
        params: { cluster },
      }
    );
    return response.data;
  },

  // Delete persistent volume claim
  deletePersistentVolumeClaim: async (
    cluster: string,
    namespace: string,
    name: string
  ) => {
    const response = await api.delete(
      `/api/storage/persistent-volume-claims/${name}`,
      {
        params: { cluster, namespace },
      }
    );
    return response.data;
  },

  // Create storage class
  createStorageClass: async (cluster: string, storageClass: any) => {
    const response = await api.post('/api/storage/classes', storageClass, {
      params: { cluster },
    });
    return response.data;
  },

  // Delete storage class
  deleteStorageClass: async (cluster: string, name: string) => {
    const response = await api.delete(`/api/storage/classes/${name}`, {
      params: { cluster },
    });
    return response.data;
  },
};

// Settings Management API
export const settingsApi = {
  // User preferences
  getUserPreferences: async () => {
    const response = await api.get('/api/settings/user-preferences');
    return response.data;
  },

  saveUserPreferences: async (preferences: any) => {
    const response = await api.put(
      '/api/settings/user-preferences',
      preferences
    );
    return response.data;
  },

  // Cluster defaults
  getClusterDefaults: async () => {
    const response = await api.get('/api/settings/cluster-defaults');
    return response.data;
  },

  saveClusterDefaults: async (defaults: any) => {
    const response = await api.put('/api/settings/cluster-defaults', defaults);
    return response.data;
  },

  // API settings
  getApiSettings: async () => {
    const response = await api.get('/api/settings/api-settings');
    return response.data;
  },

  saveApiSettings: async (settings: any) => {
    const response = await api.put('/api/settings/api-settings', settings);
    return response.data;
  },

  // System preferences
  getSystemPreferences: async () => {
    const response = await api.get('/api/settings/system-preferences');
    return response.data;
  },

  saveSystemPreferences: async (preferences: any) => {
    const response = await api.put(
      '/api/settings/system-preferences',
      preferences
    );
    return response.data;
  },

  // Security settings
  getSecuritySettings: async () => {
    const response = await api.get('/api/settings/security-settings');
    return response.data;
  },

  saveSecuritySettings: async (settings: any) => {
    const response = await api.put('/api/settings/security-settings', settings);
    return response.data;
  },

  // Notification settings
  getNotificationSettings: async () => {
    const response = await api.get('/api/settings/notification-settings');
    return response.data;
  },

  saveNotificationSettings: async (settings: any) => {
    const response = await api.put(
      '/api/settings/notification-settings',
      settings
    );
    return response.data;
  },

  // Advanced settings
  getAdvancedSettings: async () => {
    const response = await api.get('/api/settings/advanced-settings');
    return response.data;
  },

  saveAdvancedSettings: async (settings: any) => {
    const response = await api.put('/api/settings/advanced-settings', settings);
    return response.data;
  },

  // Configuration backup/restore
  exportConfiguration: async () => {
    const response = await api.get('/api/settings/export');
    return response.data;
  },

  importConfiguration: async (configuration: any) => {
    const response = await api.post('/api/settings/import', configuration);
    return response.data;
  },

  // Reset to defaults
  resetToDefaults: async () => {
    const response = await api.post('/api/settings/reset-defaults');
    return response.data;
  },

  // Validate settings
  validateSettings: async (settings: any) => {
    const response = await api.post('/api/settings/validate', settings);
    return response.data;
  },
};
