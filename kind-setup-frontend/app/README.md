# App Directory - Next.js App Router

## Overview

This directory contains the pages and routes for the Kind Setup frontend application. It follows the Next.js App Router pattern, where each folder represents a route segment and each `page.tsx` file is a publicly accessible page.

## Key Pages

### Dashboard (`/app/page.tsx`)

The dashboard provides an overview of all clusters and their status. It displays metrics like:
- Total number of clusters
- Total number of nodes
- CPU usage
- List of active clusters with their status

This page uses the `getClusterStatus` method from the API service to fetch data.

### Manage Apps (`/app/manage-apps/page.tsx`)

This page allows users to view and manage applications deployed on clusters. Features include:
- List of all applications
- Application status indicators
- Deployment actions (start, stop, delete)
- Configuration viewing

It uses the `getApplications` method from the API service to fetch application data.

### Create Cluster (`/app/create-cluster/page.tsx`)

Allows users to create new Kind clusters with custom configurations. Features include:
- Configurable number of nodes
- Advanced configuration options
- Port mapping settings
- Post-creation setup options

### Cluster Status (`/app/cluster-status/page.tsx`)

Displays detailed information about a specific cluster. Features include:
- Node information
- Resource usage metrics
- Health indicators
- Configuration details

## Shared Components

### Layout Files

- `layout.tsx`: Defines the overall page layout with navigation
- `providers.tsx`: Sets up context providers for the application

### Error Handling

- `error.tsx`: Error boundary component for graceful error handling
- `global-error.tsx`: Global error handler for application-wide errors
- `not-found.tsx`: Custom 404 page

## State Management

Each page manages its own state using React hooks. Common patterns include:

```tsx
// Example state management in a page component
const [data, setData] = useState(initial);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  // Data fetching logic
  async function fetchData() {
    setIsLoading(true);
    try {
      const result = await clusterApi.someMethod();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err);
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  }
  
  fetchData();
  
  // Optional polling
  const interval = setInterval(fetchData, 30000);
  return () => clearInterval(interval);
}, []);
```

## Data Flow

1. Pages request data from API services in `useEffect` hooks or event handlers
2. API services communicate with the backend and return data or errors
3. Page components update their state based on the responses
4. UI updates to reflect the new state

## Adding New Pages

To add a new page to the application:

1. Create a new folder in `/app` for the route (e.g., `/app/new-feature`)
2. Add a `page.tsx` file with a default export React component
3. Implement the page component using existing UI components
4. Add API service calls as needed for data fetching
5. Add error handling with try/catch blocks
6. Update navigation components to include the new page
