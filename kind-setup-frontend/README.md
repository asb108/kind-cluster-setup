# Kind Setup Frontend

## Overview

This is the frontend application for the Kind Setup project, a tool designed to simplify the creation and management of Kubernetes IN Docker (Kind) clusters. The frontend provides a user-friendly interface for creating clusters, deploying applications, and monitoring cluster status.

## Project Structure

- `/app`: Next.js App Router pages and routes
- `/components`: Reusable UI components
- `/services`: API services that connect to the backend
- `/styles`: CSS and styling files
- `/public`: Static assets

## Key Features

- **Dashboard**: View cluster statistics and list all clusters
- **Manage Apps**: Deploy and manage applications on clusters
- **Create Cluster**: Create new Kind clusters with custom configurations
- **Cluster Status**: View detailed cluster status and metrics

## API Integration

The frontend communicates with the backend API using Axios. The main API service is defined in `services/clean-api.ts` and provides the following key functionalities:

- Cluster management (create, delete, status)
- Application deployment and management
- Configuration retrieval and persistence

The API automatically falls back to mock data when the backend is not available, making development and testing easier.

## Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- Backend server running on port 8020 (optional - mock data available)

### Development

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Backend Connection

The frontend expects the backend API to be available at `http://localhost:8020`. You can modify this in the `.env.local` file or by setting the `NEXT_PUBLIC_API_URL` environment variable.

## Page Structure

- **Dashboard** (`/app/page.tsx`): Shows cluster statistics and lists all clusters
- **Manage Apps** (`/app/manage-apps/page.tsx`): Lists and manages applications
- **Create Cluster** (`/app/create-cluster/page.tsx`): Form to create new clusters
- **Cluster Status** (`/app/cluster-status/page.tsx`): Shows detailed cluster status

## Error Handling

The application includes comprehensive error handling:

- API errors are caught and displayed to the user
- When the backend is unavailable, mock data is used
- Error boundaries catch and display React component errors

## Build and Deployment

To build the application for production:

```bash
npm run build
```

The built application will be available in the `.next` directory and can be started with:

```bash
npm start
```
