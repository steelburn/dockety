import { Host, Container, Image, Volume, Network, SystemInfo, DockerStats, ComposeProject, PruneReport } from '../types';

const API_BASE = '/api';

const handleResponse = async <T>(response: Response): Promise<T> => {
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Request failed with status ${response.status}`);
    }
    if (response.status === 204) { // No Content
        return undefined as T;
    }
    // FIX: Cast to any to satisfy the generic return type, as response.json() returns Promise<unknown>.
    return response.json() as any;
};

const getTextResponse = async (response: Response): Promise<string> => {
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Request failed with status ${response.status}`);
    }
    return response.text();
};


export const dockerService = {
  getHosts: (): Promise<Host[]> => fetch(`${API_BASE}/hosts`).then(handleResponse),

  addHost: (name: string): Promise<Host> => {
      return fetch(`${API_BASE}/hosts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
      }).then(handleResponse);
  },

  updateHost: (id: string, name: string): Promise<Host> => {
       return fetch(`${API_BASE}/hosts/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
      }).then(handleResponse);
  },
  
  removeHost: (id: string): Promise<void> => {
      return fetch(`${API_BASE}/hosts/${id}`, { method: 'DELETE' }).then(handleResponse);
  },

  getSystemInfo: (hostId: string): Promise<SystemInfo> => fetch(`${API_BASE}/system/info`).then(handleResponse),
  getStats: (hostId: string): Promise<DockerStats> => fetch(`${API_BASE}/system/stats`).then(handleResponse),
  getContainers: (hostId: string): Promise<Container[]> => fetch(`${API_BASE}/containers`).then(handleResponse),
  getImages: (hostId: string): Promise<Image[]> => fetch(`${API_BASE}/images`).then(handleResponse),
  getVolumes: (hostId: string): Promise<Volume[]> => fetch(`${API_BASE}/volumes`).then(handleResponse),
  getNetworks: (hostId: string): Promise<Network[]> => fetch(`${API_BASE}/networks`).then(handleResponse),
  getComposeProjects: (hostId: string): Promise<ComposeProject[]> => fetch(`${API_BASE}/compose`).then(handleResponse),

  getContainerLogs: (hostId: string, containerId: string): Promise<string> => {
      return fetch(`${API_BASE}/containers/${containerId}/logs`).then(getTextResponse);
  },

  // Mocking this as live streaming from backend is more complex
  getNewContainerLogs: async (hostId: string, containerId: string): Promise<string> => {
    return Promise.resolve('');
  },

  // --- Actions ---
  startContainer: (hostId: string, containerId: string): Promise<void> => {
      return fetch(`${API_BASE}/containers/${containerId}/start`, { method: 'POST' }).then(handleResponse);
  },

  stopContainer: (hostId: string, containerId: string): Promise<void> => {
      return fetch(`${API_BASE}/containers/${containerId}/stop`, { method: 'POST' }).then(handleResponse);
  },

  restartContainer: (hostId: string, containerId: string): Promise<void> => {
      return fetch(`${API_BASE}/containers/${containerId}/restart`, { method: 'POST' }).then(handleResponse);
  },

  removeContainer: (hostId: string, containerId: string): Promise<void> => {
      return fetch(`${API_BASE}/containers/${containerId}`, { method: 'DELETE' }).then(handleResponse);
  },

  removeImage: (hostId: string, imageId: string): Promise<void> => {
      const formattedImageId = imageId.startsWith('sha256:') ? imageId : `sha256:${imageId}`;
      return fetch(`${API_BASE}/images/${encodeURIComponent(formattedImageId)}`, { method: 'DELETE' }).then(handleResponse);
  },
  
  removeVolume: (hostId: string, volumeName: string): Promise<void> => {
       return fetch(`${API_BASE}/volumes/${encodeURIComponent(volumeName)}`, { method: 'DELETE' }).then(handleResponse);
  },
  
  pullImage: (hostId: string, imageName: string): Promise<void> => {
      return fetch(`${API_BASE}/images/pull`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: imageName }),
      }).then(handleResponse);
  },

  createNetwork: (hostId: string, name: string, driver: string): Promise<void> => {
      return fetch(`${API_BASE}/networks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, driver }),
      }).then(handleResponse);
  },
  
  updateComposeFile: (hostId: string, projectName: string, content: string): Promise<void> => {
      // This is not supported by the live backend for security/complexity reasons.
      // We will simply do nothing but resolve the promise.
      console.warn("Updating compose files is not supported in the live backend.");
      return Promise.resolve();
  },
  
  pruneSystem: (hostId: string, options: { volumes: boolean }): Promise<PruneReport> => {
      return fetch(`${API_BASE}/system/prune`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options),
      }).then(handleResponse);
  }
};