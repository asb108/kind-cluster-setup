// Settings Management Types

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications_enabled: boolean;
  auto_refresh_interval: number;
  default_cluster_view: 'grid' | 'list';
  show_system_components: boolean;
  compact_mode: boolean;
}

export interface ClusterDefaults {
  default_worker_nodes: number;
  default_cpu_limit: string;
  default_memory_limit: string;
  default_storage_class: string;
  default_namespace: string;
  enable_ingress: boolean;
  enable_metrics_server: boolean;
  enable_dashboard: boolean;
  kind_image_version: string;
}

export interface ApiSettings {
  api_base_url: string;
  request_timeout: number;
  retry_attempts: number;
  enable_debug_mode: boolean;
  enable_mock_data: boolean;
  polling_interval: number;
  max_concurrent_requests: number;
}

export interface SystemPreferences {
  log_level: 'debug' | 'info' | 'warn' | 'error';
  enable_analytics: boolean;
  enable_crash_reporting: boolean;
  auto_cleanup_enabled: boolean;
  cleanup_retention_days: number;
  backup_enabled: boolean;
  backup_frequency: 'daily' | 'weekly' | 'monthly';
  export_format: 'json' | 'yaml';
}

export interface SecuritySettings {
  enable_rbac: boolean;
  session_timeout: number;
  require_confirmation_for_destructive_actions: boolean;
  enable_audit_logging: boolean;
  allowed_registries: string[];
  scan_images_for_vulnerabilities: boolean;
}

export interface NotificationSettings {
  email_notifications: boolean;
  email_address: string;
  webhook_url: string;
  slack_webhook: string;
  notification_types: {
    cluster_events: boolean;
    deployment_status: boolean;
    resource_alerts: boolean;
    system_updates: boolean;
  };
}

export interface AdvancedSettings {
  kubectl_path: string;
  helm_path: string;
  kind_path: string;
  docker_socket_path: string;
  custom_ca_cert_path: string;
  proxy_settings: {
    enabled: boolean;
    http_proxy: string;
    https_proxy: string;
    no_proxy: string;
  };
}

export interface ConfigurationBackup {
  id: string;
  name: string;
  description: string;
  created_at: string;
  size: string;
  includes: {
    user_preferences: boolean;
    cluster_defaults: boolean;
    api_settings: boolean;
    system_preferences: boolean;
    security_settings: boolean;
    notification_settings: boolean;
    advanced_settings: boolean;
  };
}

export interface SettingsValidation {
  field: string;
  message: string;
  type: 'error' | 'warning' | 'info';
}

export interface SettingsExport {
  version: string;
  exported_at: string;
  user_preferences?: UserPreferences;
  cluster_defaults?: ClusterDefaults;
  api_settings?: ApiSettings;
  system_preferences?: SystemPreferences;
  security_settings?: SecuritySettings;
  notification_settings?: NotificationSettings;
  advanced_settings?: AdvancedSettings;
}
