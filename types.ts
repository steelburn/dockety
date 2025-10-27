
export interface Host {
  id: string;
  name: string;
  type: 'local' | 'remote';
  host?: string; // For remote hosts
  port?: number; // For remote hosts
  tls?: boolean; // For remote hosts
  socketProxy?: boolean; // Whether this host uses Docker Socket Proxy (removes API version from paths)
  apiKey?: string; // API key for Docker Socket Proxy authentication
  status: 'unknown' | 'connected' | 'disconnected' | 'error';
  lastChecked?: string; // ISO timestamp
}

export enum ContainerState {
  CREATED = 'created',
  RUNNING = 'running',
  RESTARTING = 'restarting',
  EXITED = 'exited',
  PAUSED = 'paused',
  DEAD = 'dead',
}

export interface Container {
  id: string;
  name: string;
  image: string;
  state: ContainerState;
  status: string;
  ports: { privatePort: number; publicPort?: number; type: string }[];
  created: string;
  labels?: Record<string, string>;
  composeProject?: string;
  volumes: string[];
  network: string;
}

export interface Image {
  id: string;
  tags: string[];
  size: string;
  created: string;
  containers: string[];
}

export interface Volume {
  name: string;
  driver: string;
  mountpoint: string;
  containers: string[];
}

export interface Network {
  id: string;
  name: string;
  driver: string;
  scope: string;
  containers: string[];
  composeProjects: string[];
}

export interface SystemInfo {
  dockerVersion: string;
  os: string;
  architecture: string;
  cpus: number;
  totalMemory: string;
}

export interface DockerStats {
  runningContainers: number;
  stoppedContainers: number;
  totalContainers: number;
  totalImages: number;
  totalVolumes: number;
  totalNetworks: number;
}

export interface ComposeProject {
  name: string;
  containers: Container[];
  composeFile: string;
}

export interface PruneReport {
  spaceReclaimed: string;
  itemsDeleted: {
    containers: number;
    images: number;
    volumes: number;
  };
}


export type ViewType = 'dashboard' | 'containers' | 'images' | 'volumes' | 'networks' | 'compose' | 'hosts' | 'system';
