"use client";

import { useState, useEffect } from 'react';
import styles from './Docs.module.css';

type Theme = 'light' | 'dark' | 'nord' | 'solarized' | 'dracula';

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState('getting-started');
  const [theme, setTheme] = useState<Theme>('light');

  // Apply theme to the page
  useEffect(() => {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('docs-theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Handle theme change
  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('docs-theme', newTheme);
  };

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  // Get theme class name
  const getThemeClass = () => {
    switch (theme) {
      case 'dark': return styles.darkTheme;
      case 'nord': return styles.nordTheme;
      case 'solarized': return styles.solarizedTheme;
      case 'dracula': return styles.draculaTheme;
      default: return styles.lightTheme;
    }
  };

  return (
    <div className={`${styles.container} ${getThemeClass()}`} style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' }}>
      <h1 className={styles.pageTitle}>Kind Setup Documentation</h1>
      
      <div className={styles.infoAlert}>
        <p>This documentation provides detailed instructions on how to use the Kind Setup application to create, manage, and deploy applications to Kubernetes clusters.</p>
      </div>
      
      {/* Theme Selector */}
      <div className={styles.themeSelector}>
        <span>Theme:</span>
        <button 
          className={`${styles.themeButton} ${theme === 'light' ? styles.themeButtonActive : ''}`}
          onClick={() => handleThemeChange('light')}
        >
          Light
        </button>
        <button 
          className={`${styles.themeButton} ${theme === 'dark' ? styles.themeButtonActive : ''}`}
          onClick={() => handleThemeChange('dark')}
        >
          Dark
        </button>
        <button 
          className={`${styles.themeButton} ${theme === 'nord' ? styles.themeButtonActive : ''}`}
          onClick={() => handleThemeChange('nord')}
        >
          Nord
        </button>
        <button 
          className={`${styles.themeButton} ${theme === 'solarized' ? styles.themeButtonActive : ''}`}
          onClick={() => handleThemeChange('solarized')}
        >
          Solarized
        </button>
        <button 
          className={`${styles.themeButton} ${theme === 'dracula' ? styles.themeButtonActive : ''}`}
          onClick={() => handleThemeChange('dracula')}
        >
          Dracula
        </button>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        <button 
          onClick={() => handleTabClick('getting-started')}
          className={`${styles.tabButton} ${activeTab === 'getting-started' ? styles.tabButtonActive : ''}`}
        >
          Getting Started
        </button>
        <button 
          onClick={() => handleTabClick('creating-clusters')}
          className={`${styles.tabButton} ${activeTab === 'creating-clusters' ? styles.tabButtonActive : ''}`}
        >
          Creating Clusters
        </button>
        <button 
          onClick={() => handleTabClick('deploying-apps')}
          className={`${styles.tabButton} ${activeTab === 'deploying-apps' ? styles.tabButtonActive : ''}`}
        >
          Deploying Applications
        </button>
        <button 
          onClick={() => handleTabClick('managing-clusters')}
          className={`${styles.tabButton} ${activeTab === 'managing-clusters' ? styles.tabButtonActive : ''}`}
        >
          Managing Clusters
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'getting-started' && (
          <div>
            <h2 className={styles.sectionTitle}>Getting Started with Kind Setup</h2>
            <p>
              Kind Setup is a comprehensive tool for creating and managing local Kubernetes clusters using Kind (Kubernetes IN Docker).
              It provides a user-friendly interface for creating clusters, deploying applications, and managing resources.
            </p>
            
            <h3 className={styles.subsectionTitle}>System Requirements</h3>
            <ul>
              <li><strong>Docker:</strong> Kind requires Docker to be installed and running</li>
              <li><strong>kubectl:</strong> The Kubernetes command-line tool</li>
              <li><strong>Helm:</strong> (Optional) For deploying applications using Helm charts</li>
              <li><strong>At least 4GB of RAM</strong> available for Docker</li>
              <li><strong>At least 20GB of disk space</strong> for Docker images and containers</li>
            </ul>
            
            <h3 className={styles.subsectionTitle}>Installation</h3>
            <ol>
              <li>
                <strong>Clone the repository:</strong>
                <pre className={styles.codeBlock}>
                  git clone https://github.com/asb108/kind-cluster-setup.git
                  cd kind-cluster-setup
                </pre>
              </li>
              <li>
                <strong>Install backend dependencies:</strong>
                <pre className={styles.codeBlock}>
                  cd src
                  pip install -e .
                </pre>
              </li>
              <li>
                <strong>Install frontend dependencies:</strong>
                <pre className={styles.codeBlock}>
                  cd kind-setup-frontend
                  npm install
                </pre>
              </li>
              <li>
                <strong>Start the backend server:</strong>
                <pre className={styles.codeBlock}>
                  cd src
                  python -m kind_cluster_setup.api.server
                </pre>
              </li>
              <li>
                <strong>Start the frontend server:</strong>
                <pre className={styles.codeBlock}>
                  cd kind-setup-frontend
                  npm run dev
                </pre>
              </li>
            </ol>
          </div>
        )}

        {activeTab === 'creating-clusters' && (
          <div>
            <h2 className={styles.sectionTitle}>Creating Kubernetes Clusters</h2>
            <p>
              Kind Setup makes it easy to create and configure Kubernetes clusters with various options and resource limits.
            </p>
            
            <h3 className={styles.subsectionTitle}>Basic Cluster Creation</h3>
            <ol>
              <li>Navigate to the <strong>Create Cluster</strong> page from the sidebar.</li>
              <li>Enter a <strong>Cluster Name</strong> (must be unique and use only lowercase letters, numbers, and hyphens).</li>
              <li>Select an <strong>Environment</strong> (e.g., dev, staging, prod) to help organize your clusters.</li>
              <li>Specify the number of <strong>Worker Nodes</strong> (default: 1).</li>
              <li>Click <strong>Create Cluster</strong> to start the creation process.</li>
            </ol>
            
            <h3 className={styles.subsectionTitle}>Advanced Configuration</h3>
            <p>
              Expand the <strong>Advanced Configuration</strong> section to access additional options:
            </p>
            <ul>
              <li>
                <strong>Worker Node Configuration:</strong>
                <ul>
                  <li><strong>CPU Cores:</strong> Number of CPU cores to allocate to each worker node (default: 1)</li>
                  <li><strong>Memory (GB):</strong> Amount of memory to allocate to each worker node (default: 2GB)</li>
                </ul>
              </li>
              <li>
                <strong>Control Plane Configuration:</strong>
                <ul>
                  <li><strong>CPU Cores:</strong> Number of CPU cores to allocate to the control plane node (default: 1)</li>
                  <li><strong>Memory (GB):</strong> Amount of memory to allocate to the control plane node (default: 2GB)</li>
                </ul>
              </li>
              <li>
                <strong>Resource Limits:</strong>
                <ul>
                  <li><strong>Apply resource limits to containers:</strong> Enable/disable resource limits for the containers in the cluster</li>
                </ul>
              </li>
            </ul>
          </div>
        )}

        {activeTab === 'deploying-apps' && (
          <div>
            <h2 className={styles.sectionTitle}>Deploying Applications to Clusters</h2>
            <p>
              Kind Setup provides a streamlined way to deploy applications to your Kubernetes clusters using templates and various deployment methods.
            </p>
            
            <h3 className={styles.subsectionTitle}>Application Deployment Overview</h3>
            <p>
              The application deployment system supports:
            </p>
            <ul>
              <li><strong>Multiple Deployment Methods:</strong> kubectl, Helm, and Kustomize</li>
              <li><strong>Customizable Templates:</strong> Pre-configured application templates with customizable values</li>
              <li><strong>Resource Configuration:</strong> Easily adjust CPU, memory, and other resource settings</li>
              <li><strong>Namespace Management:</strong> Deploy applications to specific namespaces</li>
            </ul>
            
            <h3 className={styles.subsectionTitle}>Step-by-Step Deployment Guide</h3>
            <ol>
              <li>
                <strong>Navigate to the Deploy App Page:</strong>
                <p>Click on <strong>Deploy App</strong> in the sidebar to access the application deployment interface.</p>
              </li>
              <li>
                <strong>Select a Target Cluster:</strong>
                <p>Choose the Kind cluster where you want to deploy the application from the dropdown menu.</p>
              </li>
              <li>
                <strong>Choose an Application:</strong>
                <p>Select from the available application templates (e.g., Nginx, MySQL, Prometheus, etc.).</p>
              </li>
              <li>
                <strong>Configure Namespace:</strong>
                <p>Specify the Kubernetes namespace where the application should be deployed (default: "default").</p>
              </li>
              <li>
                <strong>Select Deployment Method:</strong>
                <p>Choose between kubectl, Helm, or other available deployment methods for the selected application.</p>
              </li>
              <li>
                <strong>Customize Configuration Values:</strong>
                <p>Adjust the application-specific configuration values such as:</p>
                <ul>
                  <li>Number of replicas</li>
                  <li>Resource requests and limits (CPU, memory)</li>
                  <li>Application-specific settings (e.g., database passwords, service types)</li>
                  <li>Version/tag of the container image</li>
                </ul>
              </li>
              <li>
                <strong>Deploy the Application:</strong>
                <p>Click the <strong>Deploy Application</strong> button to start the deployment process.</p>
              </li>
              <li>
                <strong>Monitor Deployment Status:</strong>
                <p>The deployment status card will show the progress and status of your deployment.</p>
              </li>
            </ol>
          </div>
        )}

        {activeTab === 'managing-clusters' && (
          <div>
            <h2 className={styles.sectionTitle}>Managing Kubernetes Clusters</h2>
            <p>
              Kind Setup provides tools for monitoring, configuring, and managing your Kubernetes clusters.
            </p>
            
            <h3 className={styles.subsectionTitle}>Viewing Cluster Status</h3>
            <p>
              The <strong>Cluster Status</strong> page provides real-time information about your clusters:
            </p>
            <ul>
              <li><strong>Node Status:</strong> View the status of control plane and worker nodes</li>
              <li><strong>Resource Usage:</strong> Monitor CPU, memory, and disk usage</li>
              <li><strong>Kubernetes Version:</strong> See the version of Kubernetes running on each node</li>
            </ul>
            
            <h3 className={styles.subsectionTitle}>Managing Cluster Resources</h3>
            <p>
              You can adjust resource allocations for existing clusters:
            </p>
            <ol>
              <li>Navigate to the cluster details page</li>
              <li>Click on <strong>Resource Limits</strong></li>
              <li>Adjust CPU and memory allocations for worker nodes and control plane</li>
              <li>Save changes to apply the new resource limits</li>
            </ol>
            
            <h3 className={styles.subsectionTitle}>Deleting Clusters</h3>
            <p>
              To delete a cluster:
            </p>
            <ol>
              <li>Navigate to the clusters list</li>
              <li>Click the <strong>Delete</strong> button for the cluster you want to remove</li>
              <li>Confirm the deletion</li>
            </ol>
            <p>
              <strong>Note:</strong> Deleting a cluster will remove all resources associated with it, including all deployed applications.
              This action cannot be undone.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
