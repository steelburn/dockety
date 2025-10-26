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
    const data = await response.json();
    return data as T;
};

const getTextResponse = async (response: Response): Promise<string> => {
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Request failed with status ${response.status}`);
    }
    return response.text();
};


export const dockerService = {
    getHosts: async (): Promise<Host[]> => {
        const response = await fetch(`${API_BASE}/hosts`);
        return handleResponse<Host[]>(response);
    },

    addHost: async (name: string, type?: 'local' | 'remote', host?: string, port?: number, tls?: boolean, socketProxy?: boolean): Promise<Host> => {
        const response = await fetch(`${API_BASE}/hosts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, type, host, port, tls, socketProxy }),
        });
        return handleResponse<Host>(response);
    },

    updateHost: async (id: string, name: string, type?: 'local' | 'remote', host?: string, port?: number, tls?: boolean, socketProxy?: boolean): Promise<Host> => {
        const response = await fetch(`${API_BASE}/hosts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, type, host, port, tls, socketProxy }),
        });
        return handleResponse<Host>(response);
    },

    removeHost: async (id: string): Promise<void> => {
        const response = await fetch(`${API_BASE}/hosts/${id}`, { method: 'DELETE' });
        return handleResponse<void>(response);
    },

    getSystemInfo: async (hostId: string): Promise<SystemInfo> => {
        const response = await fetch(`${API_BASE}/system/info?hostId=${encodeURIComponent(hostId)}`);
        return handleResponse<SystemInfo>(response);
    },

    getStats: async (hostId: string): Promise<DockerStats> => {
        const response = await fetch(`${API_BASE}/system/stats?hostId=${encodeURIComponent(hostId)}`);
        return handleResponse<DockerStats>(response);
    },

    getContainers: async (hostId: string): Promise<Container[]> => {
        const response = await fetch(`${API_BASE}/containers?hostId=${encodeURIComponent(hostId)}`);
        return handleResponse<Container[]>(response);
    },

    getImages: async (hostId: string): Promise<Image[]> => {
        const response = await fetch(`${API_BASE}/images?hostId=${encodeURIComponent(hostId)}`);
        return handleResponse<Image[]>(response);
    },

    getVolumes: async (hostId: string): Promise<Volume[]> => {
        const response = await fetch(`${API_BASE}/volumes?hostId=${encodeURIComponent(hostId)}`);
        return handleResponse<Volume[]>(response);
    },

    getNetworks: async (hostId: string): Promise<Network[]> => {
        const response = await fetch(`${API_BASE}/networks?hostId=${encodeURIComponent(hostId)}`);
        return handleResponse<Network[]>(response);
    },

    getComposeProjects: async (hostId: string): Promise<ComposeProject[]> => {
        const response = await fetch(`${API_BASE}/compose?hostId=${encodeURIComponent(hostId)}`);
        return handleResponse<ComposeProject[]>(response);
    },

    getContainerLogs: async (hostId: string, containerId: string): Promise<string> => {
        const response = await fetch(`${API_BASE}/containers/${containerId}/logs?hostId=${encodeURIComponent(hostId)}`);
        return getTextResponse(response);
    },

    // Mocking this as live streaming from backend is more complex
    getNewContainerLogs: async (hostId: string, containerId: string): Promise<string> => {
        return Promise.resolve('');
    },

    // --- Actions ---
    startContainer: async (hostId: string, containerId: string): Promise<void> => {
        const response = await fetch(`${API_BASE}/containers/${containerId}/start?hostId=${encodeURIComponent(hostId)}`, { method: 'POST' });
        return handleResponse<void>(response);
    },

    stopContainer: async (hostId: string, containerId: string): Promise<void> => {
        const response = await fetch(`${API_BASE}/containers/${containerId}/stop?hostId=${encodeURIComponent(hostId)}`, { method: 'POST' });
        return handleResponse<void>(response);
    },

    restartContainer: async (hostId: string, containerId: string): Promise<void> => {
        const response = await fetch(`${API_BASE}/containers/${containerId}/restart?hostId=${encodeURIComponent(hostId)}`, { method: 'POST' });
        return handleResponse<void>(response);
    },

    removeContainer: async (hostId: string, containerId: string): Promise<void> => {
        const response = await fetch(`${API_BASE}/containers/${containerId}?hostId=${encodeURIComponent(hostId)}`, { method: 'DELETE' });
        return handleResponse<void>(response);
    },

    removeImage: async (hostId: string, imageId: string): Promise<void> => {
        const formattedImageId = imageId.startsWith('sha256:') ? imageId : `sha256:${imageId}`;
        const response = await fetch(`${API_BASE}/images/${encodeURIComponent(formattedImageId)}?hostId=${encodeURIComponent(hostId)}`, { method: 'DELETE' });
        return handleResponse<void>(response);
    },

    removeVolume: async (hostId: string, volumeName: string): Promise<void> => {
        const response = await fetch(`${API_BASE}/volumes/${encodeURIComponent(volumeName)}?hostId=${encodeURIComponent(hostId)}`, { method: 'DELETE' });
        return handleResponse<void>(response);
    },

    pullImage: async (hostId: string, imageName: string): Promise<void> => {
        const response = await fetch(`${API_BASE}/images/pull?hostId=${encodeURIComponent(hostId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: imageName }),
        });
        return handleResponse<void>(response);
    },

    createNetwork: async (hostId: string, name: string, driver: string): Promise<void> => {
        const response = await fetch(`${API_BASE}/networks?hostId=${encodeURIComponent(hostId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, driver }),
        });
        return handleResponse<void>(response);
    },

    updateComposeFile: (hostId: string, projectName: string, content: string): Promise<void> => {
        // This is not supported by the live backend for security/complexity reasons.
        // We will simply do nothing but resolve the promise.
        console.warn("Updating compose files is not supported in the live backend.");
        return Promise.resolve();
    },

    pruneSystem: async (hostId: string, options: { volumes: boolean }): Promise<PruneReport> => {
        const response = await fetch(`${API_BASE}/system/prune?hostId=${encodeURIComponent(hostId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(options),
        });
        return handleResponse<PruneReport>(response);
    },

    execCommand: async (hostId: string, containerId: string, command: string[]): Promise<{ output: string }> => {
        const response = await fetch(`${API_BASE}/containers/${containerId}/exec?hostId=${encodeURIComponent(hostId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command }),
        });
        return handleResponse<{ output: string }>(response);
    },

    getImageInspect: async (hostId: string, imageId: string): Promise<any> => {
        const response = await fetch(`${API_BASE}/images/${encodeURIComponent(imageId)}/inspect?hostId=${encodeURIComponent(hostId)}`);
        return handleResponse<any>(response);
    },

    getImageHistory: async (hostId: string, imageId: string): Promise<any[]> => {
        const response = await fetch(`${API_BASE}/images/${encodeURIComponent(imageId)}/history?hostId=${encodeURIComponent(hostId)}`);
        return handleResponse<any[]>(response);
    },

    getContainerStats: async (hostId: string, containerId: string): Promise<any> => {
        const response = await fetch(`${API_BASE}/containers/${containerId}/stats?hostId=${encodeURIComponent(hostId)}`);
        return handleResponse<any>(response);
    },

    testHostConnection: async (hostId: string): Promise<{ status: 'connected' | 'disconnected' | 'error'; error?: string }> => {
        const response = await fetch(`${API_BASE}/hosts/${hostId}/test`, { method: 'POST' });
        return handleResponse<{ status: 'connected' | 'disconnected' | 'error'; error?: string }>(response);
    },

    testNewHostConnection: (name: string, type?: 'local' | 'remote', host?: string, port?: number, tls?: boolean, socketProxy?: boolean): Promise<{ status: 'connected' | 'disconnected' | 'error'; error?: string }> => {
        return fetch(`${API_BASE}/hosts/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, type, host, port, tls, socketProxy }),
        }).then(handleResponse) as Promise<{ status: 'connected' | 'disconnected' | 'error'; error?: string }>;
    },
};