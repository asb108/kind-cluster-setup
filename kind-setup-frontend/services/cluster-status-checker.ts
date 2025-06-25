'use client';

/**
 * Reliable cluster status checking service
 *
 * Provides methods to directly check cluster status that won't hang
 * even if the backend is busy or experiencing network issues.
 */

// Standard API URL for status checks
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8020';

/**
 * Check if a specific cluster exists by making a direct and
 * reliable API call with timeout safeguards
 */
export async function checkClusterExists(clusterName: string): Promise<boolean> {
  if (!clusterName) {
    console.warn('No cluster name provided to checkClusterExists');
    return false;
  }

  try {
    console.log(`🔍 Checking if cluster "${clusterName}" exists...`);

    // Try multiple methods to check if the cluster exists
    const methods = [
      checkViaStatusAPI,
      checkViaListAPI,
      checkViaKubectlAPI,
      checkViaDirectAPI
    ];

    // Add a global timeout for the entire operation
    const startTime = Date.now();
    const GLOBAL_TIMEOUT_MS = 20000; // 20 seconds total timeout (increased from 15s)

    // Try each method in sequence with improved error handling
    for (let i = 0; i < methods.length; i++) {
      const method = methods[i];
      try {
        // Check if we've exceeded the global timeout
        if (Date.now() - startTime > GLOBAL_TIMEOUT_MS) {
          console.warn(`Global timeout of ${GLOBAL_TIMEOUT_MS}ms exceeded for cluster existence check`);
          break;
        }

        console.log(`Checking if cluster "${clusterName}" exists via ${method.name}... (method ${i + 1}/${methods.length})`);
        const exists = await method(clusterName);
        if (exists) {
          console.log(`✅ Cluster "${clusterName}" found via ${method.name}`);
          return true;
        } else {
          console.log(`❌ Cluster "${clusterName}" not found via ${method.name}`);
        }
      } catch (methodError) {
        console.warn(`Method ${method.name} failed:`, methodError);
        // Continue to next method, but add a small delay to avoid overwhelming the backend
        if (i < methods.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    // One final attempt with a direct docker container check
    try {
      console.log(`Making final attempt to check if cluster "${clusterName}" exists via docker containers...`);

      // Use AbortController to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        try {
          controller.abort(new DOMException('Timeout exceeded', 'TimeoutError'));
        } catch (e) {
          console.warn('Error aborting controller:', e);
        }
      }, 5000); // 5s timeout

      const response = await fetch(`${API_URL}/api/docker/containers`, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        console.log('Docker containers check result:', result);

        if (result?.data?.containers) {
          // Look for containers with names that match our cluster
          const kindPrefix = 'kind-';
          const clusterPrefix = clusterName.startsWith(kindPrefix) ? clusterName : `${kindPrefix}${clusterName}`;

          const found = result.data.containers.some(
            (container: any) => container.name.includes(clusterPrefix)
          );

          if (found) {
            console.log(`✅ Cluster "${clusterName}" found via docker containers check`);
            return true;
          }
        }
      }
    } catch (dockerError) {
      console.warn('Docker containers check failed:', dockerError);
    }

    console.log(`⚠️ Cluster "${clusterName}" not found via any method`);
    return false;
  } catch (error) {
    console.error('Error checking cluster status:', error);
    // Always return a definitive answer even if there's an error
    return false;
  }
}

/**
 * Periodically check if a cluster exists with callback support
 * Useful for UI components that need to continuously monitor cluster status
 */
export function startPeriodicClusterCheck(
  clusterName: string,
  onFound: (clusterName: string) => void,
  onNotFound?: (clusterName: string) => void,
  intervalMs: number = 5000,
  maxAttempts: number = 60 // 5 minutes with 5s intervals
): () => void {
  let attempts = 0;
  let isRunning = true;

  const checkLoop = async () => {
    if (!isRunning) return;

    attempts++;
    console.log(`Periodic cluster check for "${clusterName}" (attempt ${attempts}/${maxAttempts})`);

    try {
      const exists = await checkClusterExists(clusterName);

      if (exists) {
        console.log(`✅ Periodic check found cluster "${clusterName}"`);
        onFound(clusterName);
        return; // Stop checking once found
      } else if (attempts >= maxAttempts) {
        console.log(`⏰ Periodic check for cluster "${clusterName}" reached max attempts (${maxAttempts})`);
        if (onNotFound) {
          onNotFound(clusterName);
        }
        return; // Stop checking after max attempts
      } else {
        // Continue checking
        setTimeout(checkLoop, intervalMs);
      }
    } catch (error) {
      console.error(`Error in periodic cluster check for "${clusterName}":`, error);

      if (attempts >= maxAttempts) {
        console.log(`⏰ Periodic check for cluster "${clusterName}" reached max attempts after error`);
        if (onNotFound) {
          onNotFound(clusterName);
        }
        return;
      } else {
        // Continue checking even after errors
        setTimeout(checkLoop, intervalMs);
      }
    }
  };

  // Start the checking loop
  checkLoop();

  // Return a function to stop the periodic checking
  return () => {
    console.log(`Stopping periodic cluster check for "${clusterName}"`);
    isRunning = false;
  };
}

/**
 * Check if a cluster exists via the status API
 */
async function checkViaStatusAPI(clusterName: string): Promise<boolean> {
  // Set up an abort controller with a short timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    try {
      controller.abort(new DOMException('Timeout exceeded', 'TimeoutError'));
    } catch (e) {
      console.warn('Error aborting controller:', e);
    }
  }, 6000); // 6s timeout

  try {
    // Make the API call with the abort controller
    const response = await fetch(`${API_URL}/api/cluster/status`, {
      signal: controller.signal,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`Status API check failed with code ${response.status}`);
      return false;
    }

    const result = await response.json();
    console.log('Cluster status check result:', result);

    // Check if the specified cluster exists in the results
    if (result?.data?.clusters) {
      const found = result.data.clusters.some(
        (cluster: any) => cluster.name === clusterName
      );

      return found;
    }

    return false;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Error in checkViaStatusAPI:', error);
    throw error; // Let the caller handle this
  }
}

/**
 * Check if a cluster exists via the cluster list API
 */
async function checkViaListAPI(clusterName: string): Promise<boolean> {
  // Set up an abort controller with a short timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    try {
      controller.abort(new DOMException('Timeout exceeded', 'TimeoutError'));
    } catch (e) {
      console.warn('Error aborting controller:', e);
    }
  }, 8000); // 8s timeout

  try {
    // Make the API call with the abort controller
    const response = await fetch(`${API_URL}/api/cluster/list`, {
      signal: controller.signal,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`List API check failed with code ${response.status}`);
      return false;
    }

    const result = await response.json();
    console.log('Cluster list check result:', result);

    // Check if the specified cluster exists in the list
    if (result?.data && Array.isArray(result.data)) {
      const found = result.data.some(
        (cluster: any) => cluster.name === clusterName || cluster.cluster_name === clusterName
      );

      return found;
    }

    return false;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Error in checkViaListAPI:', error);
    throw error; // Let the caller handle this
  }
}

/**
 * Check if a cluster exists via the kubectl API
 */
async function checkViaKubectlAPI(clusterName: string): Promise<boolean> {
  // Set up an abort controller with a short timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    try {
      controller.abort(new DOMException('Timeout exceeded', 'TimeoutError'));
    } catch (e) {
      console.warn('Error aborting controller:', e);
    }
  }, 6000); // 6s timeout

  try {
    // Make the API call with the abort controller
    const response = await fetch(`${API_URL}/api/kubectl/get-contexts`, {
      signal: controller.signal,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`Kubectl API check failed with code ${response.status}`);
      return false;
    }

    const result = await response.json();
    console.log('Kubectl contexts result:', result);

    // Check if the specified cluster exists in the contexts
    if (result?.data?.contexts) {
      const kindPrefix = 'kind-';
      const contextName = clusterName.startsWith(kindPrefix) ? clusterName : `${kindPrefix}${clusterName}`;

      const found = result.data.contexts.some(
        (context: any) => context.name === contextName || context.name === clusterName
      );

      return found;
    }

    return false;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Error in checkViaKubectlAPI:', error);
    throw error; // Let the caller handle this
  }
}

/**
 * Check if a cluster exists via a direct API call
 */
async function checkViaDirectAPI(clusterName: string): Promise<boolean> {
  // Set up an abort controller with a short timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    try {
      controller.abort(new DOMException('Timeout exceeded', 'TimeoutError'));
    } catch (e) {
      console.warn('Error aborting controller:', e);
    }
  }, 6000); // 6s timeout

  try {
    // Make the API call with the abort controller
    const response = await fetch(`${API_URL}/api/cluster/${clusterName}/exists`, {
      signal: controller.signal,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });

    clearTimeout(timeoutId);

    // Even if the API returns 404, it might mean the endpoint doesn't exist, not that the cluster doesn't exist
    // So we only check for successful responses
    if (response.ok) {
      const result = await response.json();
      console.log('Direct API check result:', result);

      if (result?.data?.exists === true) {
        return true;
      }
    }

    // If the API doesn't exist or returns an error, we'll try a fallback
    // Try to check if the cluster exists by checking docker containers
    const dockerResponse = await fetch(`${API_URL}/api/docker/containers`, {
      signal: controller.signal,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });

    if (dockerResponse.ok) {
      const dockerResult = await dockerResponse.json();
      console.log('Docker containers result:', dockerResult);

      if (dockerResult?.data?.containers) {
        // Look for containers with names like "kind-control-plane" or "kind-worker"
        // that belong to our cluster
        const kindPrefix = 'kind-';
        const clusterPrefix = clusterName.startsWith(kindPrefix) ? clusterName : `${kindPrefix}${clusterName}`;

        const found = dockerResult.data.containers.some(
          (container: any) => container.name.includes(clusterPrefix)
        );

        return found;
      }
    }

    return false;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Error in checkViaDirectAPI:', error);
    throw error; // Let the caller handle this
  }
}
