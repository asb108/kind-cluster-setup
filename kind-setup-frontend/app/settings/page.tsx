'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Settings as SettingsIcon,
  User,
  Server,
  Shield,
  Bell,
  Download,
  Upload,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Wrench,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import type {
  UserPreferences,
  ClusterDefaults,
  ApiSettings,
  SystemPreferences,
  SecuritySettings,
  NotificationSettings,
  AdvancedSettings,
  ConfigurationBackup,
  SettingsValidation,
} from './types';

// Mock data for development
const mockUserPreferences: UserPreferences = {
  theme: 'system',
  language: 'en',
  timezone: 'UTC',
  notifications_enabled: true,
  auto_refresh_interval: 5000,
  default_cluster_view: 'grid',
  show_system_components: false,
  compact_mode: false,
};

const mockClusterDefaults: ClusterDefaults = {
  default_worker_nodes: 2,
  default_cpu_limit: '2',
  default_memory_limit: '4Gi',
  default_storage_class: 'standard',
  default_namespace: 'default',
  enable_ingress: true,
  enable_metrics_server: true,
  enable_dashboard: false,
  kind_image_version: 'v1.28.0',
};

const mockApiSettings: ApiSettings = {
  api_base_url: 'http://localhost:8020',
  request_timeout: 60000,
  retry_attempts: 3,
  enable_debug_mode: false,
  enable_mock_data: false,
  polling_interval: 5000,
  max_concurrent_requests: 10,
};

const mockSystemPreferences: SystemPreferences = {
  log_level: 'info',
  enable_analytics: false,
  enable_crash_reporting: false,
  auto_cleanup_enabled: true,
  cleanup_retention_days: 7,
  backup_enabled: false,
  backup_frequency: 'weekly',
  export_format: 'json',
};

const mockSecuritySettings: SecuritySettings = {
  enable_rbac: true,
  session_timeout: 3600,
  require_confirmation_for_destructive_actions: true,
  enable_audit_logging: true,
  allowed_registries: ['docker.io', 'gcr.io', 'quay.io'],
  scan_images_for_vulnerabilities: false,
};

const mockNotificationSettings: NotificationSettings = {
  email_notifications: false,
  email_address: '',
  webhook_url: '',
  slack_webhook: '',
  notification_types: {
    cluster_events: true,
    deployment_status: true,
    resource_alerts: true,
    system_updates: false,
  },
};

const mockAdvancedSettings: AdvancedSettings = {
  kubectl_path: '/usr/local/bin/kubectl',
  helm_path: '/usr/local/bin/helm',
  kind_path: '/usr/local/bin/kind',
  docker_socket_path: '/var/run/docker.sock',
  custom_ca_cert_path: '',
  proxy_settings: {
    enabled: false,
    http_proxy: '',
    https_proxy: '',
    no_proxy: 'localhost,127.0.0.1',
  },
};

const mockBackups: ConfigurationBackup[] = [
  {
    id: '1',
    name: 'Production Settings Backup',
    description: 'Complete configuration backup before migration',
    created_at: '2024-01-15T10:30:00Z',
    size: '2.4 KB',
    includes: {
      user_preferences: true,
      cluster_defaults: true,
      api_settings: true,
      system_preferences: true,
      security_settings: true,
      notification_settings: true,
      advanced_settings: true,
    },
  },
  {
    id: '2',
    name: 'User Preferences Only',
    description: 'Backup of user interface preferences',
    created_at: '2024-01-10T14:20:00Z',
    size: '0.8 KB',
    includes: {
      user_preferences: true,
      cluster_defaults: false,
      api_settings: false,
      system_preferences: false,
      security_settings: false,
      notification_settings: false,
      advanced_settings: false,
    },
  },
];

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('user-preferences');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Settings state
  const [userPreferences, setUserPreferences] =
    useState<UserPreferences>(mockUserPreferences);
  const [clusterDefaults, setClusterDefaults] =
    useState<ClusterDefaults>(mockClusterDefaults);
  const [apiSettings, setApiSettings] = useState<ApiSettings>(mockApiSettings);
  const [systemPreferences, setSystemPreferences] = useState<SystemPreferences>(
    mockSystemPreferences
  );
  const [securitySettings, setSecuritySettings] =
    useState<SecuritySettings>(mockSecuritySettings);
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(mockNotificationSettings);
  const [advancedSettings, setAdvancedSettings] =
    useState<AdvancedSettings>(mockAdvancedSettings);

  // Dialog states
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Other states
  const [validationErrors, setValidationErrors] = useState<
    SettingsValidation[]
  >([]);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [configBackups, setConfigBackups] =
    useState<ConfigurationBackup[]>(mockBackups);
  const [importData, setImportData] = useState('');
  const [showSensitiveData, setShowSensitiveData] = useState(false);

  const { toast } = useToast();

  // Load settings
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with actual API calls
      // const preferences = await settingsApi.getUserPreferences()
      // const defaults = await settingsApi.getClusterDefaults()
      // const api = await settingsApi.getApiSettings()
      // etc.

      // Mock loading delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Settings are already loaded with mock data
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load settings. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Save settings
  const saveSettings = async () => {
    try {
      setSaving(true);
      setValidationErrors([]);

      // Validate settings
      const errors = validateSettings();
      if (errors.length > 0) {
        setValidationErrors(errors);
        toast({
          title: 'Validation Error',
          description: 'Please fix the validation errors before saving',
          variant: 'destructive',
        });
        return;
      }

      // TODO: Replace with actual API calls
      // await settingsApi.saveUserPreferences(userPreferences)
      // await settingsApi.saveClusterDefaults(clusterDefaults)
      // etc.

      // Mock save delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      setHasUnsavedChanges(false);
      toast({
        title: 'Settings Saved',
        description: 'Your settings have been saved successfully',
      });
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Validate settings
  const validateSettings = (): SettingsValidation[] => {
    const errors: SettingsValidation[] = [];

    // Validate API settings
    if (!apiSettings.api_base_url) {
      errors.push({
        field: 'api_base_url',
        message: 'API base URL is required',
        type: 'error',
      });
    }

    if (apiSettings.request_timeout < 1000) {
      errors.push({
        field: 'request_timeout',
        message: 'Request timeout should be at least 1000ms',
        type: 'warning',
      });
    }

    // Validate notification settings
    if (
      notificationSettings.email_notifications &&
      !notificationSettings.email_address
    ) {
      errors.push({
        field: 'email_address',
        message:
          'Email address is required when email notifications are enabled',
        type: 'error',
      });
    }

    // Validate cluster defaults
    if (clusterDefaults.default_worker_nodes < 1) {
      errors.push({
        field: 'default_worker_nodes',
        message: 'At least 1 worker node is required',
        type: 'error',
      });
    }

    return errors;
  };

  // Handle setting changes
  const handleSettingChange = (section: string, field: string, value: any) => {
    setHasUnsavedChanges(true);

    switch (section) {
      case 'user-preferences':
        setUserPreferences(prev => ({ ...prev, [field]: value }));
        break;
      case 'cluster-defaults':
        setClusterDefaults(prev => ({ ...prev, [field]: value }));
        break;
      case 'api-settings':
        setApiSettings(prev => ({ ...prev, [field]: value }));
        break;
      case 'system-preferences':
        setSystemPreferences(prev => ({ ...prev, [field]: value }));
        break;
      case 'security-settings':
        setSecuritySettings(prev => ({ ...prev, [field]: value }));
        break;
      case 'notification-settings':
        setNotificationSettings(prev => ({ ...prev, [field]: value }));
        break;
      case 'advanced-settings':
        setAdvancedSettings(prev => ({ ...prev, [field]: value }));
        break;
    }
  };

  // Export configuration
  const exportConfiguration = () => {
    const config = {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      user_preferences: userPreferences,
      cluster_defaults: clusterDefaults,
      api_settings: apiSettings,
      system_preferences: systemPreferences,
      security_settings: securitySettings,
      notification_settings: notificationSettings,
      advanced_settings: advancedSettings,
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kind-cluster-setup-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Configuration Exported',
      description: 'Configuration has been downloaded successfully',
    });
  };

  // Import configuration
  const importConfiguration = async () => {
    try {
      const config = JSON.parse(importData);

      // Validate imported configuration
      if (!config.version) {
        throw new Error('Invalid configuration format');
      }

      // Apply imported settings
      if (config.user_preferences) setUserPreferences(config.user_preferences);
      if (config.cluster_defaults) setClusterDefaults(config.cluster_defaults);
      if (config.api_settings) setApiSettings(config.api_settings);
      if (config.system_preferences)
        setSystemPreferences(config.system_preferences);
      if (config.security_settings)
        setSecuritySettings(config.security_settings);
      if (config.notification_settings)
        setNotificationSettings(config.notification_settings);
      if (config.advanced_settings)
        setAdvancedSettings(config.advanced_settings);

      setHasUnsavedChanges(true);
      setImportDialogOpen(false);
      setImportData('');

      toast({
        title: 'Configuration Imported',
        description:
          "Configuration has been imported successfully. Don't forget to save your changes.",
      });
    } catch (err) {
      toast({
        title: 'Import Error',
        description: 'Failed to import configuration. Please check the format.',
        variant: 'destructive',
      });
    }
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setUserPreferences(mockUserPreferences);
    setClusterDefaults(mockClusterDefaults);
    setApiSettings(mockApiSettings);
    setSystemPreferences(mockSystemPreferences);
    setSecuritySettings(mockSecuritySettings);
    setNotificationSettings(mockNotificationSettings);
    setAdvancedSettings(mockAdvancedSettings);

    setHasUnsavedChanges(true);
    setResetDialogOpen(false);

    toast({
      title: 'Settings Reset',
      description:
        "All settings have been reset to defaults. Don't forget to save your changes.",
    });
  };

  if (loading) {
    return (
      <div className='container mx-auto p-6 space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold'>Settings</h1>
            <p className='text-muted-foreground'>
              Configure your application preferences and system settings
            </p>
          </div>
        </div>
        <div className='animate-pulse space-y-4'>
          <div className='h-10 bg-gray-200 rounded w-full'></div>
          <div className='h-64 bg-gray-200 rounded w-full'></div>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Settings</h1>
          <p className='text-muted-foreground'>
            Configure your application preferences and system settings
          </p>
        </div>
        <div className='flex items-center gap-2'>
          {hasUnsavedChanges && (
            <Badge
              variant='outline'
              className='text-orange-600 border-orange-600'
            >
              Unsaved Changes
            </Badge>
          )}
          <Button variant='outline' onClick={() => setExportDialogOpen(true)}>
            <Download className='h-4 w-4 mr-2' />
            Export
          </Button>
          <Button variant='outline' onClick={() => setImportDialogOpen(true)}>
            <Upload className='h-4 w-4 mr-2' />
            Import
          </Button>
          <Button
            onClick={saveSettings}
            disabled={saving || !hasUnsavedChanges}
          >
            <Save className={`h-4 w-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertTitle>Validation Errors</AlertTitle>
          <AlertDescription>
            <ul className='list-disc list-inside space-y-1'>
              {validationErrors.map((error, index) => (
                <li key={index}>{error.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Settings Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className='space-y-4'
      >
        <TabsList className='grid w-full grid-cols-3 lg:grid-cols-6'>
          <TabsTrigger
            value='user-preferences'
            className='flex items-center gap-2'
          >
            <User className='h-4 w-4' />
            <span className='hidden sm:inline'>User</span>
          </TabsTrigger>
          <TabsTrigger
            value='cluster-defaults'
            className='flex items-center gap-2'
          >
            <Server className='h-4 w-4' />
            <span className='hidden sm:inline'>Clusters</span>
          </TabsTrigger>
          <TabsTrigger value='api-settings' className='flex items-center gap-2'>
            <SettingsIcon className='h-4 w-4' />
            <span className='hidden sm:inline'>API</span>
          </TabsTrigger>
          <TabsTrigger
            value='security-settings'
            className='flex items-center gap-2'
          >
            <Shield className='h-4 w-4' />
            <span className='hidden sm:inline'>Security</span>
          </TabsTrigger>
          <TabsTrigger
            value='notification-settings'
            className='flex items-center gap-2'
          >
            <Bell className='h-4 w-4' />
            <span className='hidden sm:inline'>Notifications</span>
          </TabsTrigger>
          <TabsTrigger
            value='advanced-settings'
            className='flex items-center gap-2'
          >
            <Wrench className='h-4 w-4' />
            <span className='hidden sm:inline'>Advanced</span>
          </TabsTrigger>
        </TabsList>

        {/* User Preferences Tab */}
        <TabsContent value='user-preferences' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>User Interface</CardTitle>
              <CardDescription>
                Customize your interface preferences
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='space-y-2'>
                  <Label htmlFor='theme'>Theme</Label>
                  <Select
                    value={userPreferences.theme}
                    onValueChange={value =>
                      handleSettingChange('user-preferences', 'theme', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='light'>Light</SelectItem>
                      <SelectItem value='dark'>Dark</SelectItem>
                      <SelectItem value='system'>System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='language'>Language</Label>
                  <Select
                    value={userPreferences.language}
                    onValueChange={value =>
                      handleSettingChange('user-preferences', 'language', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='en'>English</SelectItem>
                      <SelectItem value='es'>Spanish</SelectItem>
                      <SelectItem value='fr'>French</SelectItem>
                      <SelectItem value='de'>German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='timezone'>Timezone</Label>
                  <Select
                    value={userPreferences.timezone}
                    onValueChange={value =>
                      handleSettingChange('user-preferences', 'timezone', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='UTC'>UTC</SelectItem>
                      <SelectItem value='America/New_York'>
                        Eastern Time
                      </SelectItem>
                      <SelectItem value='America/Chicago'>
                        Central Time
                      </SelectItem>
                      <SelectItem value='America/Denver'>
                        Mountain Time
                      </SelectItem>
                      <SelectItem value='America/Los_Angeles'>
                        Pacific Time
                      </SelectItem>
                      <SelectItem value='Europe/London'>London</SelectItem>
                      <SelectItem value='Europe/Paris'>Paris</SelectItem>
                      <SelectItem value='Asia/Tokyo'>Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='default-view'>Default Cluster View</Label>
                  <Select
                    value={userPreferences.default_cluster_view}
                    onValueChange={value =>
                      handleSettingChange(
                        'user-preferences',
                        'default_cluster_view',
                        value
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='grid'>Grid View</SelectItem>
                      <SelectItem value='list'>List View</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className='space-y-4'>
                <h4 className='text-sm font-medium'>Display Options</h4>
                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <Label>Show System Components</Label>
                      <p className='text-sm text-muted-foreground'>
                        Display system pods and services in application lists
                      </p>
                    </div>
                    <Switch
                      checked={userPreferences.show_system_components}
                      onCheckedChange={checked =>
                        handleSettingChange(
                          'user-preferences',
                          'show_system_components',
                          checked
                        )
                      }
                    />
                  </div>

                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <Label>Compact Mode</Label>
                      <p className='text-sm text-muted-foreground'>
                        Use a more compact layout to show more information
                      </p>
                    </div>
                    <Switch
                      checked={userPreferences.compact_mode}
                      onCheckedChange={checked =>
                        handleSettingChange(
                          'user-preferences',
                          'compact_mode',
                          checked
                        )
                      }
                    />
                  </div>

                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <Label>Enable Notifications</Label>
                      <p className='text-sm text-muted-foreground'>
                        Show browser notifications for important events
                      </p>
                    </div>
                    <Switch
                      checked={userPreferences.notifications_enabled}
                      onCheckedChange={checked =>
                        handleSettingChange(
                          'user-preferences',
                          'notifications_enabled',
                          checked
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className='space-y-4'>
                <h4 className='text-sm font-medium'>Auto Refresh</h4>
                <div className='space-y-2'>
                  <Label>
                    Refresh Interval:{' '}
                    {userPreferences.auto_refresh_interval / 1000}s
                  </Label>
                  <Slider
                    value={[userPreferences.auto_refresh_interval]}
                    onValueChange={([value]) =>
                      handleSettingChange(
                        'user-preferences',
                        'auto_refresh_interval',
                        value
                      )
                    }
                    max={30000}
                    min={1000}
                    step={1000}
                    className='w-full'
                  />
                  <p className='text-sm text-muted-foreground'>
                    How often to refresh data automatically (1-30 seconds)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cluster Defaults Tab */}
        <TabsContent value='cluster-defaults' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Default Cluster Configuration</CardTitle>
              <CardDescription>
                Set default values for new cluster creation
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='space-y-2'>
                  <Label htmlFor='worker-nodes'>Default Worker Nodes</Label>
                  <Input
                    type='number'
                    min='1'
                    max='10'
                    value={clusterDefaults.default_worker_nodes}
                    onChange={e =>
                      handleSettingChange(
                        'cluster-defaults',
                        'default_worker_nodes',
                        parseInt(e.target.value)
                      )
                    }
                  />
                  <p className='text-sm text-muted-foreground'>
                    Number of worker nodes to create by default
                  </p>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='cpu-limit'>Default CPU Limit</Label>
                  <Input
                    value={clusterDefaults.default_cpu_limit}
                    onChange={e =>
                      handleSettingChange(
                        'cluster-defaults',
                        'default_cpu_limit',
                        e.target.value
                      )
                    }
                    placeholder='2'
                  />
                  <p className='text-sm text-muted-foreground'>
                    CPU limit per node (e.g., 2, 4)
                  </p>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='memory-limit'>Default Memory Limit</Label>
                  <Input
                    value={clusterDefaults.default_memory_limit}
                    onChange={e =>
                      handleSettingChange(
                        'cluster-defaults',
                        'default_memory_limit',
                        e.target.value
                      )
                    }
                    placeholder='4Gi'
                  />
                  <p className='text-sm text-muted-foreground'>
                    Memory limit per node (e.g., 4Gi, 8Gi)
                  </p>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='storage-class'>Default Storage Class</Label>
                  <Input
                    value={clusterDefaults.default_storage_class}
                    onChange={e =>
                      handleSettingChange(
                        'cluster-defaults',
                        'default_storage_class',
                        e.target.value
                      )
                    }
                    placeholder='standard'
                  />
                  <p className='text-sm text-muted-foreground'>
                    Default storage class for persistent volumes
                  </p>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='namespace'>Default Namespace</Label>
                  <Input
                    value={clusterDefaults.default_namespace}
                    onChange={e =>
                      handleSettingChange(
                        'cluster-defaults',
                        'default_namespace',
                        e.target.value
                      )
                    }
                    placeholder='default'
                  />
                  <p className='text-sm text-muted-foreground'>
                    Default namespace for application deployments
                  </p>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='kind-version'>Kind Image Version</Label>
                  <Select
                    value={clusterDefaults.kind_image_version}
                    onValueChange={value =>
                      handleSettingChange(
                        'cluster-defaults',
                        'kind_image_version',
                        value
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='v1.28.0'>v1.28.0 (Latest)</SelectItem>
                      <SelectItem value='v1.27.3'>v1.27.3</SelectItem>
                      <SelectItem value='v1.26.6'>v1.26.6</SelectItem>
                      <SelectItem value='v1.25.11'>v1.25.11</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className='text-sm text-muted-foreground'>
                    Kubernetes version for new clusters
                  </p>
                </div>
              </div>

              <Separator />

              <div className='space-y-4'>
                <h4 className='text-sm font-medium'>Default Add-ons</h4>
                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <Label>Enable Ingress Controller</Label>
                      <p className='text-sm text-muted-foreground'>
                        Install NGINX ingress controller by default
                      </p>
                    </div>
                    <Switch
                      checked={clusterDefaults.enable_ingress}
                      onCheckedChange={checked =>
                        handleSettingChange(
                          'cluster-defaults',
                          'enable_ingress',
                          checked
                        )
                      }
                    />
                  </div>

                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <Label>Enable Metrics Server</Label>
                      <p className='text-sm text-muted-foreground'>
                        Install metrics server for resource monitoring
                      </p>
                    </div>
                    <Switch
                      checked={clusterDefaults.enable_metrics_server}
                      onCheckedChange={checked =>
                        handleSettingChange(
                          'cluster-defaults',
                          'enable_metrics_server',
                          checked
                        )
                      }
                    />
                  </div>

                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <Label>Enable Kubernetes Dashboard</Label>
                      <p className='text-sm text-muted-foreground'>
                        Install Kubernetes web dashboard
                      </p>
                    </div>
                    <Switch
                      checked={clusterDefaults.enable_dashboard}
                      onCheckedChange={checked =>
                        handleSettingChange(
                          'cluster-defaults',
                          'enable_dashboard',
                          checked
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Settings Tab */}
        <TabsContent value='api-settings' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Configure API connection and behavior settings
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='space-y-2'>
                  <Label htmlFor='api-url'>API Base URL</Label>
                  <Input
                    value={apiSettings.api_base_url}
                    onChange={e =>
                      handleSettingChange(
                        'api-settings',
                        'api_base_url',
                        e.target.value
                      )
                    }
                    placeholder='http://localhost:8020'
                  />
                  <p className='text-sm text-muted-foreground'>
                    Base URL for the backend API
                  </p>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='timeout'>Request Timeout (ms)</Label>
                  <Input
                    type='number'
                    min='1000'
                    max='300000'
                    value={apiSettings.request_timeout}
                    onChange={e =>
                      handleSettingChange(
                        'api-settings',
                        'request_timeout',
                        parseInt(e.target.value)
                      )
                    }
                  />
                  <p className='text-sm text-muted-foreground'>
                    Timeout for API requests in milliseconds
                  </p>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='retry-attempts'>Retry Attempts</Label>
                  <Input
                    type='number'
                    min='0'
                    max='10'
                    value={apiSettings.retry_attempts}
                    onChange={e =>
                      handleSettingChange(
                        'api-settings',
                        'retry_attempts',
                        parseInt(e.target.value)
                      )
                    }
                  />
                  <p className='text-sm text-muted-foreground'>
                    Number of retry attempts for failed requests
                  </p>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='polling-interval'>
                    Polling Interval (ms)
                  </Label>
                  <Input
                    type='number'
                    min='1000'
                    max='60000'
                    value={apiSettings.polling_interval}
                    onChange={e =>
                      handleSettingChange(
                        'api-settings',
                        'polling_interval',
                        parseInt(e.target.value)
                      )
                    }
                  />
                  <p className='text-sm text-muted-foreground'>
                    Interval for status polling in milliseconds
                  </p>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='max-requests'>Max Concurrent Requests</Label>
                  <Input
                    type='number'
                    min='1'
                    max='50'
                    value={apiSettings.max_concurrent_requests}
                    onChange={e =>
                      handleSettingChange(
                        'api-settings',
                        'max_concurrent_requests',
                        parseInt(e.target.value)
                      )
                    }
                  />
                  <p className='text-sm text-muted-foreground'>
                    Maximum number of concurrent API requests
                  </p>
                </div>
              </div>

              <Separator />

              <div className='space-y-4'>
                <h4 className='text-sm font-medium'>Development Options</h4>
                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <Label>Enable Debug Mode</Label>
                      <p className='text-sm text-muted-foreground'>
                        Show detailed API request/response information
                      </p>
                    </div>
                    <Switch
                      checked={apiSettings.enable_debug_mode}
                      onCheckedChange={checked =>
                        handleSettingChange(
                          'api-settings',
                          'enable_debug_mode',
                          checked
                        )
                      }
                    />
                  </div>

                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <Label>Enable Mock Data</Label>
                      <p className='text-sm text-muted-foreground'>
                        Use mock data instead of real API calls for development
                      </p>
                    </div>
                    <Switch
                      checked={apiSettings.enable_mock_data}
                      onCheckedChange={checked =>
                        handleSettingChange(
                          'api-settings',
                          'enable_mock_data',
                          checked
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings Tab */}
        <TabsContent value='security-settings' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Security Configuration</CardTitle>
              <CardDescription>
                Configure security and access control settings
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <div className='space-y-0.5'>
                    <Label>Enable RBAC</Label>
                    <p className='text-sm text-muted-foreground'>
                      Enable Role-Based Access Control for clusters
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.enable_rbac}
                    onCheckedChange={checked =>
                      handleSettingChange(
                        'security-settings',
                        'enable_rbac',
                        checked
                      )
                    }
                  />
                </div>

                <div className='flex items-center justify-between'>
                  <div className='space-y-0.5'>
                    <Label>Require Confirmation for Destructive Actions</Label>
                    <p className='text-sm text-muted-foreground'>
                      Show confirmation dialogs for delete operations
                    </p>
                  </div>
                  <Switch
                    checked={
                      securitySettings.require_confirmation_for_destructive_actions
                    }
                    onCheckedChange={checked =>
                      handleSettingChange(
                        'security-settings',
                        'require_confirmation_for_destructive_actions',
                        checked
                      )
                    }
                  />
                </div>

                <div className='flex items-center justify-between'>
                  <div className='space-y-0.5'>
                    <Label>Enable Audit Logging</Label>
                    <p className='text-sm text-muted-foreground'>
                      Log all administrative actions for security auditing
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.enable_audit_logging}
                    onCheckedChange={checked =>
                      handleSettingChange(
                        'security-settings',
                        'enable_audit_logging',
                        checked
                      )
                    }
                  />
                </div>

                <div className='flex items-center justify-between'>
                  <div className='space-y-0.5'>
                    <Label>Scan Images for Vulnerabilities</Label>
                    <p className='text-sm text-muted-foreground'>
                      Automatically scan container images for security
                      vulnerabilities
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.scan_images_for_vulnerabilities}
                    onCheckedChange={checked =>
                      handleSettingChange(
                        'security-settings',
                        'scan_images_for_vulnerabilities',
                        checked
                      )
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='session-timeout'>
                    Session Timeout (seconds)
                  </Label>
                  <Input
                    type='number'
                    min='300'
                    max='86400'
                    value={securitySettings.session_timeout}
                    onChange={e =>
                      handleSettingChange(
                        'security-settings',
                        'session_timeout',
                        parseInt(e.target.value)
                      )
                    }
                  />
                  <p className='text-sm text-muted-foreground'>
                    Automatic logout after inactivity
                  </p>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='allowed-registries'>
                    Allowed Container Registries
                  </Label>
                  <Textarea
                    value={securitySettings.allowed_registries.join('\n')}
                    onChange={e =>
                      handleSettingChange(
                        'security-settings',
                        'allowed_registries',
                        e.target.value.split('\n').filter(r => r.trim())
                      )
                    }
                    placeholder='docker.io&#10;gcr.io&#10;quay.io'
                    rows={4}
                  />
                  <p className='text-sm text-muted-foreground'>
                    One registry per line. Leave empty to allow all registries.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings Tab */}
        <TabsContent value='notification-settings' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Notification Configuration</CardTitle>
              <CardDescription>
                Configure how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <div className='space-y-0.5'>
                    <Label>Email Notifications</Label>
                    <p className='text-sm text-muted-foreground'>
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.email_notifications}
                    onCheckedChange={checked =>
                      handleSettingChange(
                        'notification-settings',
                        'email_notifications',
                        checked
                      )
                    }
                  />
                </div>

                {notificationSettings.email_notifications && (
                  <div className='space-y-2'>
                    <Label htmlFor='email-address'>Email Address</Label>
                    <Input
                      type='email'
                      value={notificationSettings.email_address}
                      onChange={e =>
                        handleSettingChange(
                          'notification-settings',
                          'email_address',
                          e.target.value
                        )
                      }
                      placeholder='your@email.com'
                    />
                  </div>
                )}

                <div className='space-y-2'>
                  <Label htmlFor='webhook-url'>Webhook URL</Label>
                  <Input
                    type='url'
                    value={notificationSettings.webhook_url}
                    onChange={e =>
                      handleSettingChange(
                        'notification-settings',
                        'webhook_url',
                        e.target.value
                      )
                    }
                    placeholder='https://your-webhook-url.com'
                  />
                  <p className='text-sm text-muted-foreground'>
                    HTTP endpoint to receive notification webhooks
                  </p>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='slack-webhook'>Slack Webhook URL</Label>
                  <Input
                    type='url'
                    value={notificationSettings.slack_webhook}
                    onChange={e =>
                      handleSettingChange(
                        'notification-settings',
                        'slack_webhook',
                        e.target.value
                      )
                    }
                    placeholder='https://hooks.slack.com/services/...'
                  />
                  <p className='text-sm text-muted-foreground'>
                    Slack incoming webhook URL for notifications
                  </p>
                </div>
              </div>

              <Separator />

              <div className='space-y-4'>
                <h4 className='text-sm font-medium'>Notification Types</h4>
                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <Label>Cluster Events</Label>
                      <p className='text-sm text-muted-foreground'>
                        Notifications for cluster creation, deletion, and status
                        changes
                      </p>
                    </div>
                    <Switch
                      checked={
                        notificationSettings.notification_types.cluster_events
                      }
                      onCheckedChange={checked =>
                        handleSettingChange(
                          'notification-settings',
                          'notification_types',
                          {
                            ...notificationSettings.notification_types,
                            cluster_events: checked,
                          }
                        )
                      }
                    />
                  </div>

                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <Label>Deployment Status</Label>
                      <p className='text-sm text-muted-foreground'>
                        Notifications for application deployment success/failure
                      </p>
                    </div>
                    <Switch
                      checked={
                        notificationSettings.notification_types
                          .deployment_status
                      }
                      onCheckedChange={checked =>
                        handleSettingChange(
                          'notification-settings',
                          'notification_types',
                          {
                            ...notificationSettings.notification_types,
                            deployment_status: checked,
                          }
                        )
                      }
                    />
                  </div>

                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <Label>Resource Alerts</Label>
                      <p className='text-sm text-muted-foreground'>
                        Notifications for resource usage and health alerts
                      </p>
                    </div>
                    <Switch
                      checked={
                        notificationSettings.notification_types.resource_alerts
                      }
                      onCheckedChange={checked =>
                        handleSettingChange(
                          'notification-settings',
                          'notification_types',
                          {
                            ...notificationSettings.notification_types,
                            resource_alerts: checked,
                          }
                        )
                      }
                    />
                  </div>

                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <Label>System Updates</Label>
                      <p className='text-sm text-muted-foreground'>
                        Notifications for system updates and maintenance
                      </p>
                    </div>
                    <Switch
                      checked={
                        notificationSettings.notification_types.system_updates
                      }
                      onCheckedChange={checked =>
                        handleSettingChange(
                          'notification-settings',
                          'notification_types',
                          {
                            ...notificationSettings.notification_types,
                            system_updates: checked,
                          }
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Settings Tab */}
        <TabsContent value='advanced-settings' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Advanced Configuration</CardTitle>
              <CardDescription>
                Advanced system settings and tool paths
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <Alert>
                <Info className='h-4 w-4' />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  These are advanced settings. Incorrect values may cause the
                  application to malfunction.
                </AlertDescription>
              </Alert>

              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='kubectl-path'>kubectl Path</Label>
                  <Input
                    value={advancedSettings.kubectl_path}
                    onChange={e =>
                      handleSettingChange(
                        'advanced-settings',
                        'kubectl_path',
                        e.target.value
                      )
                    }
                    placeholder='/usr/local/bin/kubectl'
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='helm-path'>Helm Path</Label>
                  <Input
                    value={advancedSettings.helm_path}
                    onChange={e =>
                      handleSettingChange(
                        'advanced-settings',
                        'helm_path',
                        e.target.value
                      )
                    }
                    placeholder='/usr/local/bin/helm'
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='kind-path'>Kind Path</Label>
                  <Input
                    value={advancedSettings.kind_path}
                    onChange={e =>
                      handleSettingChange(
                        'advanced-settings',
                        'kind_path',
                        e.target.value
                      )
                    }
                    placeholder='/usr/local/bin/kind'
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='docker-socket'>Docker Socket Path</Label>
                  <Input
                    value={advancedSettings.docker_socket_path}
                    onChange={e =>
                      handleSettingChange(
                        'advanced-settings',
                        'docker_socket_path',
                        e.target.value
                      )
                    }
                    placeholder='/var/run/docker.sock'
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='ca-cert'>Custom CA Certificate Path</Label>
                  <Input
                    value={advancedSettings.custom_ca_cert_path}
                    onChange={e =>
                      handleSettingChange(
                        'advanced-settings',
                        'custom_ca_cert_path',
                        e.target.value
                      )
                    }
                    placeholder='/path/to/ca-cert.pem'
                  />
                  <p className='text-sm text-muted-foreground'>
                    Optional custom CA certificate for HTTPS connections
                  </p>
                </div>
              </div>

              <Separator />

              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <Label>Enable Proxy Settings</Label>
                  <Switch
                    checked={advancedSettings.proxy_settings.enabled}
                    onCheckedChange={checked =>
                      handleSettingChange(
                        'advanced-settings',
                        'proxy_settings',
                        {
                          ...advancedSettings.proxy_settings,
                          enabled: checked,
                        }
                      )
                    }
                  />
                </div>

                {advancedSettings.proxy_settings.enabled && (
                  <div className='space-y-4 pl-4 border-l-2 border-gray-200'>
                    <div className='space-y-2'>
                      <Label htmlFor='http-proxy'>HTTP Proxy</Label>
                      <Input
                        value={advancedSettings.proxy_settings.http_proxy}
                        onChange={e =>
                          handleSettingChange(
                            'advanced-settings',
                            'proxy_settings',
                            {
                              ...advancedSettings.proxy_settings,
                              http_proxy: e.target.value,
                            }
                          )
                        }
                        placeholder='http://proxy.example.com:8080'
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label htmlFor='https-proxy'>HTTPS Proxy</Label>
                      <Input
                        value={advancedSettings.proxy_settings.https_proxy}
                        onChange={e =>
                          handleSettingChange(
                            'advanced-settings',
                            'proxy_settings',
                            {
                              ...advancedSettings.proxy_settings,
                              https_proxy: e.target.value,
                            }
                          )
                        }
                        placeholder='https://proxy.example.com:8080'
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label htmlFor='no-proxy'>No Proxy</Label>
                      <Input
                        value={advancedSettings.proxy_settings.no_proxy}
                        onChange={e =>
                          handleSettingChange(
                            'advanced-settings',
                            'proxy_settings',
                            {
                              ...advancedSettings.proxy_settings,
                              no_proxy: e.target.value,
                            }
                          )
                        }
                        placeholder='localhost,127.0.0.1,.local'
                      />
                      <p className='text-sm text-muted-foreground'>
                        Comma-separated list of hosts to bypass proxy
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className='flex justify-end'>
                <Button
                  variant='destructive'
                  onClick={() => setResetDialogOpen(true)}
                >
                  <Trash2 className='h-4 w-4 mr-2' />
                  Reset to Defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export Configuration Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Configuration</DialogTitle>
            <DialogDescription>
              Download your current configuration as a JSON file for backup or
              sharing.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <Alert>
              <Info className='h-4 w-4' />
              <AlertTitle>Export Information</AlertTitle>
              <AlertDescription>
                This will export all your current settings including user
                preferences, cluster defaults, API settings, and security
                configuration.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setExportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={exportConfiguration}>
              <Download className='h-4 w-4 mr-2' />
              Export Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Configuration Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Import Configuration</DialogTitle>
            <DialogDescription>
              Import configuration from a previously exported JSON file.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <Alert>
              <AlertCircle className='h-4 w-4' />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Importing configuration will overwrite your current settings.
                Make sure to export your current configuration first if you want
                to keep it.
              </AlertDescription>
            </Alert>
            <div className='space-y-2'>
              <Label htmlFor='import-data'>Configuration JSON</Label>
              <Textarea
                id='import-data'
                value={importData}
                onChange={e => setImportData(e.target.value)}
                placeholder='Paste your configuration JSON here...'
                rows={10}
                className='font-mono text-sm'
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setImportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={importConfiguration} disabled={!importData.trim()}>
              <Upload className='h-4 w-4 mr-2' />
              Import Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset to Defaults Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset to Defaults</DialogTitle>
            <DialogDescription>
              Are you sure you want to reset all settings to their default
              values?
            </DialogDescription>
          </DialogHeader>
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              This action cannot be undone. All your current settings will be
              lost.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant='outline' onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant='destructive' onClick={resetToDefaults}>
              <Trash2 className='h-4 w-4 mr-2' />
              Reset to Defaults
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
