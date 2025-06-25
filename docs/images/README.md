# Screenshots Directory

This directory contains screenshots of the Kind Cluster Setup user interface.

## Screenshots

The following screenshots showcase the main features of the application:

- `dashboard.png` - Main dashboard with cluster overview
- `create_cluster.png` - Cluster creation interface
- `deploy_app.png` - Application deployment with templates
- `manage_apps.png` - Application management page
- `manage_storage.png` - Storage resource management (NEW)
- `settings.png` - Application settings and configuration (NEW)

## Generating Screenshots

To generate fresh screenshots:

1. Start the application:
   ```bash
   # Backend
   python -m kind_cluster_setup.api.server

   # Frontend (install dependencies first if needed)
   cd kind-setup-frontend
   npm install  # Only needed if node_modules doesn't exist
   npm run dev
   ```

2. Navigate to http://localhost:3000

3. Take screenshots of each major page:
   - Dashboard (`/`)
   - Create Cluster (`/create-cluster`)
   - Deploy App (`/deploy-app`)
   - Manage Apps (`/manage-apps`)
   - Storage Management (`/manage-storage`)
   - Settings (`/settings`)

4. Save screenshots as PNG files in this directory

## Image Guidelines

- **Resolution**: 1920x1080 or higher
- **Format**: PNG for best quality
- **Content**: Show realistic data when possible
- **Consistency**: Use the same theme/settings across screenshots
- **Annotations**: Consider adding callouts for key features

## Usage in Documentation

Screenshots are referenced in:
- `docs/ui-guide.md` - Comprehensive UI documentation
- `README.md` - Project overview and features
- GitHub repository - Social preview and documentation
