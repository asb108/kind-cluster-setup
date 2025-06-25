"use client";

import { useState, useEffect, useCallback } from 'react';
import type { ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { clusterApi } from '@/services/api';

// Define AppTemplate interface locally since it's not exported from the API
interface AppTemplate extends TemplateMetadata {
  name: string;
  default_values?: Record<string, any>;
  deployment_methods?: string[];
  icon?: string;
  category?: string;
}
import { AlertCircle, CheckCircle2, Loader2, Server, Database, Package } from 'lucide-react';
import { DashboardLayout } from '@/components/ui/dashboard-layout';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { FormGroup, FormSection, FormInput, FormSelect, FormLabel, FormInfo } from '@/components/ui/form-components';
import { Progress } from '@/components/ui/progress';
import { DynamicForm, type TemplateMetadata } from '@/components/ui/dynamic-form';

// Define interfaces
interface ClusterInfo {
  name: string;
  status: string;
  created_at: string;
  worker_nodes: number;
  environment: string;
}

// FormField components to combine label and input/select
interface FormFieldInputProps {
  label: string;
  id: string;
  hint?: string;
  [key: string]: any;
}

function FormFieldInput({ label, id, hint, ...props }: FormFieldInputProps) {
  return (
    <div className="mb-4">
      <FormLabel htmlFor={id}>{label}</FormLabel>
      <FormInput id={id} hint={hint} {...props} />
    </div>
  );
}

interface FormFieldSelectProps {
  label: string;
  id: string;
  options: Array<{value: string, label: string}>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}

interface FormFieldCheckboxProps {
  label: string;
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}

function FormFieldCheckbox({ label, id, checked, onChange, hint }: FormFieldCheckboxProps) {
  return (
    <div className="mb-4">
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor={id} className="font-medium cursor-pointer">{label}</label>
          {hint && <p className="text-muted-foreground text-xs mt-1">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

function FormFieldSelect({ label, id, options, value, onChange, placeholder, hint }: FormFieldSelectProps) {
  return (
    <div className="mb-4">
      <FormLabel htmlFor={id}>{label}</FormLabel>
      <FormSelect
        id={id}
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        hint={hint}
      />
    </div>
  );
}

export default function DeployAppPage() {
  const router = useRouter();
  const [clusters, setClusters] = useState<any[]>([]);
  const [templates, setTemplates] = useState<AppTemplate[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<string>('');
  const [selectedApp, setSelectedApp] = useState<string>('');
  const [namespace, setNamespace] = useState<string>('default');
  const [deploymentMethod, setDeploymentMethod] = useState<string>('kubectl');
  const [customValues, setCustomValues] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<any>(null);
  const [formValid, setFormValid] = useState<boolean>(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Get selected template
  const selectedTemplate = templates.find(t => t.name === selectedApp);

  // Memoize validation change handler to prevent infinite loops
  const handleValidationChange = useCallback((isValid: boolean, errors: Record<string, string>) => {
    setFormValid(isValid);
    setFormErrors(errors);
  }, []);

  // Load clusters and app templates
  useEffect(() => {
    const fetchData = async () => {
      console.log('🚀 DEPLOY-APP: Starting to fetch data...');
      setIsLoading(true);
      try {
        console.log('🔄 DEPLOY-APP: Making direct fetch API calls...');

        // Test with direct fetch calls instead of the API service
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8020';
        const [clustersResponse, templatesResponse] = await Promise.all([
          fetch(`${apiUrl}/api/cluster/status`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }),
          fetch(`${apiUrl}/api/apps/templates`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          })
        ]);

        console.log('✅ DEPLOY-APP: Fetch calls completed!');
        console.log('📊 DEPLOY-APP: Clusters response status:', clustersResponse.status);
        console.log('📦 DEPLOY-APP: Templates response status:', templatesResponse.status);

        if (clustersResponse.ok && templatesResponse.ok) {
          const clustersData = await clustersResponse.json();
          const templatesData = await templatesResponse.json();

          console.log('📊 DEPLOY-APP: Raw clusters data:', clustersData);
          console.log('📦 DEPLOY-APP: Raw templates data:', templatesData);

          // Extract clusters from the response
          const clusters = clustersData.data?.clusters || [];
          const templates = templatesData.data || templatesData;

          console.log(`🎯 DEPLOY-APP: Extracted ${clusters.length} clusters and ${templates.length} templates`);

          setClusters(clusters);
          setTemplates(templates);

          // Set defaults if data is available
          if (clusters.length > 0) {
            setSelectedCluster(clusters[0].name);
            console.log(`🎯 DEPLOY-APP: Selected default cluster: ${clusters[0].name}`);
          }
          if (templates.length > 0) {
            setSelectedApp(templates[0].name);
            console.log(`🎯 DEPLOY-APP: Selected default app: ${templates[0].name}`);
            // Initialize custom values with default values from the template
            setCustomValues(templates[0].default_values || {});
          }
        } else {
          throw new Error(`API calls failed: clusters ${clustersResponse.status}, templates ${templatesResponse.status}`);
        }
      } catch (err) {
        console.error('❌ DEPLOY-APP: Error loading data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
        console.log('🏁 DEPLOY-APP: Finished loading data');
      }
    };

    fetchData();
  }, []);

  // Update custom values when selected app changes
  useEffect(() => {
    if (selectedApp && templates.length > 0) {
      const template = templates.find(t => t.name === selectedApp);
      if (template) {
        // Initialize values from template parameters or default_values
        const initialValues: Record<string, any> = {};

        if (template.parameters) {
          // Use new parameter system
          Object.entries(template.parameters).forEach(([key, param]) => {
            initialValues[key] = param.default;
          });
        } else if (template.default_values) {
          // Fallback to old default_values system
          Object.assign(initialValues, template.default_values);
        }

        setCustomValues(initialValues);

        // Set deployment method to the first available method
        if (template.deployment_methods && template.deployment_methods.length > 0) {
          setDeploymentMethod(template.deployment_methods[0]);
        }
      }
    }
  }, [selectedApp, templates]);

  // Handle form submission
  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeploying(true);
    setError(null);
    setSuccess(null);
    setTaskId(null);
    setTaskStatus(null);

    try {
      const result = await clusterApi.deployApplication(
        selectedCluster,
        selectedApp,
        namespace,
        customValues,
        deploymentMethod
      );

      // Type assertion to avoid TypeScript errors
      const typedResult = result as { task_id?: string };

      if (typedResult.task_id) {
        setTaskId(typedResult.task_id);
        setSuccess(`Started deployment of ${selectedApp} to ${selectedCluster}`);

        // Start polling for task status
        pollTaskStatus(typedResult.task_id);
      } else {
        setSuccess(`Started deployment of ${selectedApp} to ${selectedCluster}`);
      }
    } catch (err) {
      setError('Failed to deploy application. Please try again.');
      console.error('Error deploying application:', err);
    } finally {
      setIsDeploying(false);
    }
  };

  // Poll for task status
  const pollTaskStatus = async (taskId: string) => {
    try {
      const status = await clusterApi.getClusterTaskStatus(taskId);
      setTaskStatus(status);

      if (status.completed) {
        if (status.status === 'completed') {
          setSuccess(`Successfully deployed ${selectedApp} to ${selectedCluster}`);
        } else {
          setError(`Deployment failed: ${status.message}`);
        }
        return;
      }

      // Continue polling if not completed
      setTimeout(() => pollTaskStatus(taskId), 2000);
    } catch (err) {
      console.error('Error polling task status:', err);
      setError('Failed to get deployment status. Please check the cluster manually.');
    }
  };

  // Handle custom value changes
  const handleValueChange = (key: string, value: any) => {
    setCustomValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Render loading state
  if (isLoading) {
    return (
      <DashboardLayout
        title="Deploy Application"
        description="Deploy applications to your Kubernetes clusters"
      >
        <div className="flex justify-center items-center" style={{ height: '50vh' }}>
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading application templates...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Deploy Application"
      description="Deploy applications to your Kubernetes clusters"
    >
      {error && (
        <div className="alert-error p-4 rounded-md mb-6 flex items-start">
          <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium">Error</h4>
            <p>{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="alert-success p-4 rounded-md mb-6 flex items-start">
          <CheckCircle2 className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium">Success</h4>
            <p>{success}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EnhancedCard
            title="Deploy Application to Cluster"
            icon={<Server className="h-5 w-5" />}
            className="mb-6"
          >
            <form onSubmit={handleDeploy} className="space-y-6">
              <FormSection title="Target Settings" description="Select where to deploy your application">
                <FormGroup>
                  {/* Target Cluster Selection */}
                  <FormFieldSelect
                    label="Target Cluster"
                    id="target-cluster"
                    value={selectedCluster}
                    onChange={(value) => setSelectedCluster(value)}
                    options={clusters.map(cluster => ({
                      value: cluster.name,
                      label: `${cluster.name} (${cluster.status})`
                    }))}
                    placeholder="Select a cluster"
                    hint="Choose the Kubernetes cluster to deploy to"
                  />

                  {/* Application Selection */}
                  <FormFieldSelect
                    label="Application"
                    id="application"
                    value={selectedApp}
                    onChange={(value) => setSelectedApp(value)}
                    options={templates.map(template => ({
                      value: template.name,
                      label: `${template.display_name} (${template.version})`
                    }))}
                    placeholder="Select an application"
                    hint="Choose the application to deploy"
                  />

                  {/* Namespace options */}
                  <div className="space-y-2">
                    <FormFieldInput
                      label="Namespace"
                      id="namespace"
                      type="text"
                      value={namespace}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setNamespace(e.target.value)}
                      placeholder="default"
                      hint="Kubernetes namespace for the application"
                    />

                    <div className="flex items-center space-x-2 mt-1">
                      <button
                        type="button"
                        className="text-xs text-primary hover:text-primary/80 transition-colors"
                        onClick={() => setNamespace(`${selectedApp}-${selectedCluster}`)}
                      >
                        Use app-cluster name
                      </button>
                      <span className="text-muted-foreground text-xs">|</span>
                      <button
                        type="button"
                        className="text-xs text-primary hover:text-primary/80 transition-colors"
                        onClick={() => setNamespace(selectedApp)}
                      >
                        Use app name
                      </button>
                      <span className="text-muted-foreground text-xs">|</span>
                      <button
                        type="button"
                        className="text-xs text-primary hover:text-primary/80 transition-colors"
                        onClick={() => setNamespace('default')}
                      >
                        Use default
                      </button>
                    </div>
                  </div>

                  {/* Deployment Method */}
                  {selectedTemplate && selectedTemplate.deployment_methods && (
                    <FormFieldSelect
                      label="Deployment Method"
                      id="deployment-method"
                      value={deploymentMethod}
                      onChange={(value) => setDeploymentMethod(value)}
                      options={selectedTemplate.deployment_methods.map(method => ({
                        value: method,
                        label: method.charAt(0).toUpperCase() + method.slice(1)
                      }))}
                      hint="Method used to deploy the application"
                    />
                  )}
                </FormGroup>
              </FormSection>

              {/* Advanced Deployment Options */}
              <FormSection title="Advanced Options" description="Configure additional deployment settings">
                <FormGroup>
                  <FormFieldCheckbox
                    label="Create Ingress"
                    id="create-ingress"
                    checked={customValues.create_ingress || false}
                    onChange={(checked) => handleValueChange('create_ingress', checked)}
                    hint="Create an ingress resource to expose the application externally"
                  />

                  {customValues.create_ingress && (
                    <FormFieldInput
                      label="Ingress Host"
                      id="ingress-host"
                      type="text"
                      value={customValues.ingress_host || `${selectedApp}.local`}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleValueChange('ingress_host', e.target.value)}
                      placeholder={`${selectedApp}.local`}
                      hint="Hostname for the ingress resource"
                    />
                  )}

                  <FormFieldSelect
                    label="Service Type"
                    id="service-type"
                    value={customValues.service_type || 'ClusterIP'}
                    onChange={(value) => handleValueChange('service_type', value)}
                    options={[
                      { value: 'ClusterIP', label: 'ClusterIP (internal only)' },
                      { value: 'NodePort', label: 'NodePort (exposed on node ports)' },
                      { value: 'LoadBalancer', label: 'LoadBalancer (requires cloud provider)' }
                    ]}
                    hint="Type of Kubernetes service to create"
                  />

                  {customValues.service_type === 'NodePort' && (
                    <FormFieldInput
                      label="Node Port"
                      id="node-port"
                      type="number"
                      min="30000"
                      max="32767"
                      value={customValues.node_port || '30080'}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleValueChange('node_port', parseInt(e.target.value))}
                      hint="Port to expose on the node (30000-32767)"
                    />
                  )}
                </FormGroup>
              </FormSection>

              {/* Dynamic Configuration Form */}
              {selectedTemplate && selectedTemplate.parameters && (
                <FormSection title="Application Configuration" description="Configure application parameters">
                  <DynamicForm
                    template={selectedTemplate}
                    values={customValues}
                    onChange={setCustomValues}
                    onValidationChange={handleValidationChange}
                  />
                </FormSection>
              )}

              {/* Legacy Custom Values (for templates without parameters) */}
              {selectedApp && selectedTemplate && !selectedTemplate.parameters && Object.keys(customValues).length > 0 && (
                <FormSection title="Configuration Values" description="Customize application settings">
                  <FormGroup>
                    {Object.entries(customValues)
                      .filter(([key]) => !['create_ingress', 'ingress_host', 'service_type', 'node_port'].includes(key))
                      .map(([key, value]) => (
                        <FormFieldInput
                          key={key}
                          label={key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
                          id={`config-${key}`}
                          type={typeof value === 'number' ? 'number' : 'text'}
                          value={value.toString()}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => handleValueChange(
                            key,
                            typeof value === 'number' ? parseFloat(e.target.value) : e.target.value
                          )}
                        />
                    ))}
                  </FormGroup>
                </FormSection>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <EnhancedButton
                  variant="outline"
                  onClick={() => router.push('/clusters')}
                  type="button"
                >
                  Cancel
                </EnhancedButton>
                <EnhancedButton
                  type="submit"
                  disabled={isDeploying || !selectedCluster || !selectedApp || !formValid}
                  loading={isDeploying}
                  icon={<Package className="w-4 h-4" />}
                >
                  {isDeploying ? 'Deploying...' : 'Deploy Application'}
                </EnhancedButton>
              </div>
            </form>
          </EnhancedCard>
        </div>

        <div className="lg:col-span-1">
          {/* Application Info Card */}
          {selectedTemplate && (
            <EnhancedCard
              title="Application Details"
              icon={<Database className="h-5 w-5" />}
              className="mb-6"
            >
              <div className="flex flex-col items-center mb-4">
                {selectedTemplate.icon && (
                  <Image
                    src={selectedTemplate.icon}
                    alt={selectedTemplate.display_name}
                    style={{ maxHeight: '80px', maxWidth: '100%' }}
                    className="mb-3"
                    width={80}
                    height={80}
                  />
                )}
                <h3 className="text-xl font-medium">{selectedTemplate.display_name}</h3>
                <div className="text-muted-foreground mb-3">
                  Version: {selectedTemplate.version}
                </div>
              </div>
              <p className="mb-4">{selectedTemplate.description}</p>
              <div className="flex items-center text-sm text-muted-foreground">
                <span className="font-medium mr-2">Category:</span> {selectedTemplate.category}
              </div>
            </EnhancedCard>
          )}

          {/* Deployment Status Card */}
          {taskStatus && (
            <EnhancedCard
              title="Deployment Status"
              icon={taskStatus.status === 'completed' ?
                <CheckCircle2 className="h-5 w-5 text-success" /> :
                (taskStatus.status === 'failed' ?
                  <AlertCircle className="h-5 w-5 text-destructive" /> :
                  <Loader2 className="h-5 w-5 animate-spin" />)
              }
            >
              <div className="space-y-4">
                <div className="flex items-center">
                  <span className="font-medium mr-2">Status:</span>
                  <span className={
                    taskStatus.status === 'completed' ? 'text-success' :
                    (taskStatus.status === 'failed' ? 'text-destructive' : '')
                  }>
                    {taskStatus.status.charAt(0).toUpperCase() + taskStatus.status.slice(1)}
                  </span>
                </div>

                {taskStatus.progress !== undefined && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">Progress:</span>
                      <span>{taskStatus.progress}%</span>
                    </div>
                    <Progress value={taskStatus.progress} className="h-2" />
                  </div>
                )}

                {taskStatus.message && (
                  <div>
                    <span className="font-medium block mb-1">Message:</span>
                    <p className="text-sm text-muted-foreground">{taskStatus.message}</p>
                  </div>
                )}
              </div>
            </EnhancedCard>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
