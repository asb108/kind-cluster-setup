// Storage Management Types

export interface StorageClass {
  name: string;
  provisioner: string;
  reclaim_policy: string;
  volume_binding_mode: string;
  allow_volume_expansion: boolean;
  parameters: Record<string, string>;
  cluster: string;
  is_default: boolean;
  created_at: string;
}

export interface PersistentVolume {
  name: string;
  capacity: string;
  access_modes: string[];
  reclaim_policy: string;
  status: string;
  claim?: string;
  storage_class?: string;
  cluster: string;
  node_affinity?: any;
  created_at: string;
  path?: string;
  host_path?: string;
}

export interface PersistentVolumeClaim {
  name: string;
  namespace: string;
  status: string;
  volume?: string;
  capacity?: string;
  access_modes: string[];
  storage_class?: string;
  cluster: string;
  created_at: string;
  requested_storage: string;
  used_storage?: string;
  app_label?: string;
}

export interface StorageMetrics {
  total_capacity: string;
  used_capacity: string;
  available_capacity: string;
  utilization_percentage: number;
  pv_count: number;
  pvc_count: number;
  storage_class_count: number;
  cluster: string;
}

export interface StorageOverview {
  clusters: string[];
  total_pvs: number;
  total_pvcs: number;
  total_storage_classes: number;
  total_capacity: string;
  used_capacity: string;
  metrics_by_cluster: Record<string, StorageMetrics>;
}

export interface StorageEvent {
  type: string;
  reason: string;
  message: string;
  timestamp: string;
  object_name: string;
  object_kind: string;
  namespace?: string;
  cluster: string;
}
