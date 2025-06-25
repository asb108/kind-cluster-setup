// Define common types used throughout the application

// Interface for the NodePort option
export interface NodePortOption {
  url?: string;
  nodePort: number;
  serviceName?: string;
  port?: number;
  targetPort?: number;
  type?: string;
}

// Interface for access URL
export interface AccessUrl {
  type: string;
  url: string;
}

// Interface for pod container
export interface Container {
  name: string;
  image: string;
  ready: boolean;
  state: string;
}

// Interface for pod
export interface Pod {
  name: string;
  phase: string;
  ready: boolean;
  containers: Container[];
}

// Interface for service port
export interface ServicePort {
  name: string;
  port: number;
  target_port: number;
  node_port?: number;
}

// Interface for service
export interface Service {
  name: string;
  type: string;
  cluster_ip: string;
  external_ip: string;
  ports: ServicePort[];
}

// Interface for ingress host
export interface IngressHost {
  name: string;
  hosts: string[];
}

// Interface for app info
export interface AppInfo {
  admin_user?: string;
  admin_password?: string;
  [key: string]: any;
}

// Interface for deployment status
export interface DeploymentStatus {
  app: string;
  namespace: string;
  pods: Pod[];
  services: Service[];
  ingresses?: IngressHost[];
  access_urls: AccessUrl[];
  app_info?: AppInfo;
}
