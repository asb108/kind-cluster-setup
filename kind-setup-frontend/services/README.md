# Frontend Services

## Overview

This directory contains the services that connect the frontend to the backend API. These services handle all communication between the UI components and the server.

## Files

- `clean-api.ts`: The primary API service that communicates with the backend. Contains all methods for cluster and application management.
- `api.ts`: Legacy API service (being phased out in favor of clean-api.ts).
- `direct-airflow.ts`: Specialized service for Airflow deployments.

## Using the API Services

### Main API Service (`clean-api.ts`)

The `clean-api.ts` file exports a `clusterApi` object that contains all methods for interacting with the backend. This service automatically handles:

- Error handling and retries
- Fallback to mock data when the backend is unavailable
- Type safety through TypeScript interfaces
- Consistent response formats

### Example Usage

```typescript
import { clusterApi } from '@/services/clean-api';

// Get cluster status
async function fetchClusterStatus() {
  try {
    const status = await clusterApi.getClusterStatus();
    console.log('Clusters:', status.clusters);
    return status;
  } catch (error) {
    console.error('Error fetching cluster status:', error);
    return null;
  }
}

// Deploy an application
async function deployApp(clusterName, appName) {
  try {
    await clusterApi.deployApplication(
      clusterName,
      appName,
      'default',  // namespace
      {},         // values
      'helm',     // deployment method
      'latest'    // version
    );
    return true;
  } catch (error) {
    console.error('Error deploying application:', error);
    return false;
  }
}
```

## Mock Data

When the backend is unavailable, the `clean-api.ts` service will automatically use mock data. This allows development to continue even when the backend is not running.

Mock data is defined at the top of the `clean-api.ts` file and includes:

- Mock applications
- Mock clusters
- Mock configuration options

## Error Handling

All API methods include comprehensive error handling that:

1. Detects when the backend is unavailable
2. Falls back to mock data when appropriate
3. Provides meaningful error messages
4. Logs detailed debugging information

## Adding New API Methods

When adding new API methods to `clean-api.ts`, follow this pattern:

1. Define any new interfaces needed for request/response data
2. Add a new method to the `clusterApi` object
3. Include proper error handling with try/catch blocks
4. Add mock data support for when the backend is unavailable
5. Add detailed logging for debugging purposes
