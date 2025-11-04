import { Host, Container, Image, Volume, Network, SystemInfo, DockerStats, ComposeProject, PruneReport, User } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

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

// Helper function to get headers for a host, including API key if socket proxy is enabled
const getHeadersForHost = async (hostId: string, additionalHeaders: Record<string, string> = {}): Promise<Record<string, string>> => {
    const hosts = await dockerService.getHosts();
    const host = hosts.find(h => h.id === hostId);

    const headers = { ...additionalHeaders };

    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (host?.socketProxy && host?.apiKey) {
        headers['x-api-key'] = host.apiKey;
    }

    return headers;
};


export const dockerService = {
    isFirstUser: async (): Promise<{ isFirstUser: boolean }> => {
        const response = await fetch(`${API_BASE}/auth/is-first-user`);
        return handleResponse<{ isFirstUser: boolean }>(response);
    },

    login: async (username: string, password: string): Promise<{ token: string; user: { id: string; username: string; role: string; isApproved: boolean } }> => {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        return handleResponse<{ token: string; user: { id: string; username: string; role: string; isApproved: boolean } }>(response);
    },

    register: async (username: string, password: string): Promise<{ token?: string; user: { id: string; username: string; role: string; isApproved: boolean }; message?: string }> => {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        return handleResponse<{ token?: string; user: { id: string; username: string; role: string; isApproved: boolean }; message?: string }>(response);
    },

    getUsers: async (): Promise<User[]> => {
        const headers = {};
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE}/users`, { headers });
        return handleResponse<User[]>(response);
    },

    getPendingUsers: async (): Promise<User[]> => {
        const headers = {};
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE}/users/pending`, { headers });
        return handleResponse<User[]>(response);
    },

    approveUser: async (userId: string): Promise<{ message: string }> => {
        const headers = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE}/users/${userId}/approve`, {
            method: 'POST',
            headers,
        });
        return handleResponse<{ message: string }>(response);
    },

    updateUserRole: async (userId: string, role: 'admin' | 'user'): Promise<{ message: string }> => {
        const headers = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE}/users/${userId}/role`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ role }),
        });
        return handleResponse<{ message: string }>(response);
    },

    transferOwnership: async (newOwnerId: string): Promise<{ message: string }> => {
        const headers = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE}/users/transfer-ownership`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ newOwnerId }),
        });
        return handleResponse<{ message: string }>(response);
    },

    deleteUser: async (userId: string): Promise<void> => {
        const headers = {};
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE}/users/${userId}`, {
            method: 'DELETE',
            headers,
        });
        return handleResponse<void>(response);
    },

    changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
        const headers = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE}/auth/change-password`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ currentPassword, newPassword }),
        });
        return handleResponse<{ message: string }>(response);
    },

    getHosts: async (): Promise<Host[]> => {
        const headers = {};
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE}/hosts`, { headers });
        return handleResponse<Host[]>(response);
    },

    addHost: async (name: string, type?: 'local' | 'remote', host?: string, port?: number, tls?: boolean, socketProxy?: boolean, apiKey?: string): Promise<Host> => {
        const headers = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE}/hosts`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ name, type, host, port, tls, socketProxy, apiKey }),
        });
        return handleResponse<Host>(response);
    },

    updateHost: async (id: string, name: string, type?: 'local' | 'remote', host?: string, port?: number, tls?: boolean, socketProxy?: boolean, apiKey?: string): Promise<Host> => {
        const headers = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE}/hosts/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ name, type, host, port, tls, socketProxy, apiKey }),
        });
        return handleResponse<Host>(response);
    },

    removeHost: async (id: string): Promise<void> => {
        const headers = {};
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE}/hosts/${id}`, { method: 'DELETE', headers });
        return handleResponse<void>(response);
    },

    getSystemInfo: async (hostId: string): Promise<SystemInfo> => {
        const headers = await getHeadersForHost(hostId);
        const response = await fetch(`${API_BASE}/system/info?hostId=${encodeURIComponent(hostId)}`, {
            headers,
        });
        return handleResponse<SystemInfo>(response);
    },

    getStats: async (hostId: string): Promise<DockerStats> => {
        const headers = await getHeadersForHost(hostId);
        const response = await fetch(`${API_BASE}/system/stats?hostId=${encodeURIComponent(hostId)}`, {
            headers,
        });
        return handleResponse<DockerStats>(response);
    },

    getContainers: async (hostId: string): Promise<Container[]> => {
        const headers = await getHeadersForHost(hostId);
        const response = await fetch(`${API_BASE}/containers?hostId=${encodeURIComponent(hostId)}`, {
            headers,
        });
        return handleResponse<Container[]>(response);
    },

    getImages: async (hostId: string): Promise<Image[]> => {
        const headers = await getHeadersForHost(hostId);
        const response = await fetch(`${API_BASE}/images?hostId=${encodeURIComponent(hostId)}`, {
            headers,
        });
        return handleResponse<Image[]>(response);
    },

    getVolumes: async (hostId: string): Promise<Volume[]> => {
        const headers = await getHeadersForHost(hostId);
        const response = await fetch(`${API_BASE}/volumes?hostId=${encodeURIComponent(hostId)}`, {
            headers,
        });
        return handleResponse<Volume[]>(response);
    },

    getNetworks: async (hostId: string): Promise<Network[]> => {
        const headers = await getHeadersForHost(hostId);
        const response = await fetch(`${API_BASE}/networks?hostId=${encodeURIComponent(hostId)}`, {
            headers,
        });
        return handleResponse<Network[]>(response);
    },

    getComposeProjects: async (hostId: string): Promise<ComposeProject[]> => {
        const headers = await getHeadersForHost(hostId);
        const response = await fetch(`${API_BASE}/compose?hostId=${encodeURIComponent(hostId)}`, {
            headers,
        });
        return handleResponse<ComposeProject[]>(response);
    },

    getContainerLogs: async (hostId: string, containerId: string): Promise<string> => {
        const headers = await getHeadersForHost(hostId);
        const response = await fetch(`${API_BASE}/containers/${containerId}/logs?hostId=${encodeURIComponent(hostId)}`, {
            headers,
        });
        return getTextResponse(response);
    },

    // Mocking this as live streaming from backend is more complex
    getNewContainerLogs: async (hostId: string, containerId: string): Promise<string> => {
        return Promise.resolve('');
    },

    // --- Actions ---
    startContainer: async (hostId: string, containerId: string): Promise<void> => {
        const headers = await getHeadersForHost(hostId);
        const response = await fetch(`${API_BASE}/containers/${containerId}/start?hostId=${encodeURIComponent(hostId)}`, {
            method: 'POST',
            headers,
        });
        return handleResponse<void>(response);
    },

    stopContainer: async (hostId: string, containerId: string): Promise<void> => {
        const headers = await getHeadersForHost(hostId);
        const response = await fetch(`${API_BASE}/containers/${containerId}/stop?hostId=${encodeURIComponent(hostId)}`, {
            method: 'POST',
            headers,
        });
        return handleResponse<void>(response);
    },

    restartContainer: async (hostId: string, containerId: string): Promise<void> => {
        const headers = await getHeadersForHost(hostId);
        const response = await fetch(`${API_BASE}/containers/${containerId}/restart?hostId=${encodeURIComponent(hostId)}`, {
            method: 'POST',
            headers,
        });
        return handleResponse<void>(response);
    },

    removeContainer: async (hostId: string, containerId: string): Promise<void> => {
        const headers = await getHeadersForHost(hostId);
        const response = await fetch(`${API_BASE}/containers/${containerId}?hostId=${encodeURIComponent(hostId)}`, {
            method: 'DELETE',
            headers,
        });
        return handleResponse<void>(response);
    },

    removeImage: async (hostId: string, imageId: string): Promise<void> => {
        const headers = await getHeadersForHost(hostId);
        const formattedImageId = imageId.startsWith('sha256:') ? imageId : `sha256:${imageId}`;
        const response = await fetch(`${API_BASE}/images/${encodeURIComponent(formattedImageId)}?hostId=${encodeURIComponent(hostId)}`, {
            method: 'DELETE',
            headers,
        });
        return handleResponse<void>(response);
    },

    removeVolume: async (hostId: string, volumeName: string): Promise<void> => {
        const headers = await getHeadersForHost(hostId);
        const response = await fetch(`${API_BASE}/volumes/${encodeURIComponent(volumeName)}?hostId=${encodeURIComponent(hostId)}`, {
            method: 'DELETE',
            headers,
        });
        return handleResponse<void>(response);
    },

    pullImage: async (hostId: string, imageName: string): Promise<void> => {
        const headers = await getHeadersForHost(hostId, { 'Content-Type': 'application/json' });
        const response = await fetch(`${API_BASE}/images/pull?hostId=${encodeURIComponent(hostId)}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: imageName }),
        });
        return handleResponse<void>(response);
    },

    createNetwork: async (hostId: string, name: string, driver: string, options?: { subnet?: string; gateway?: string; ipRange?: string; labels?: Record<string, string> }): Promise<void> => {
        const headers = await getHeadersForHost(hostId, { 'Content-Type': 'application/json' });
        const response = await fetch(`${API_BASE}/networks?hostId=${encodeURIComponent(hostId)}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ name, driver, ...options }),
        });
        return handleResponse<void>(response);
    },

    deleteNetwork: async (hostId: string, networkId: string): Promise<void> => {
        const headers = await getHeadersForHost(hostId);
        const response = await fetch(`${API_BASE}/networks/${encodeURIComponent(networkId)}?hostId=${encodeURIComponent(hostId)}`, {
            method: 'DELETE',
            headers,
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
        const headers = await getHeadersForHost(hostId, { 'Content-Type': 'application/json' });
        const response = await fetch(`${API_BASE}/system/prune?hostId=${encodeURIComponent(hostId)}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(options),
        });
        return handleResponse<PruneReport>(response);
    },

    execCommand: async (hostId: string, containerId: string, command: string[]): Promise<{ output: string }> => {
        const headers = await getHeadersForHost(hostId, { 'Content-Type': 'application/json' });
        const response = await fetch(`${API_BASE}/containers/${containerId}/exec?hostId=${encodeURIComponent(hostId)}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ command }),
        });
        return handleResponse<{ output: string }>(response);
    },

    getImageInspect: async (hostId: string, imageId: string): Promise<any> => {
        const headers = await getHeadersForHost(hostId);
        const response = await fetch(`${API_BASE}/images/${encodeURIComponent(imageId)}/inspect?hostId=${encodeURIComponent(hostId)}`, {
            headers,
        });
        return handleResponse<any>(response);
    },

    getImageHistory: async (hostId: string, imageId: string): Promise<any[]> => {
        const headers = await getHeadersForHost(hostId);
        const response = await fetch(`${API_BASE}/images/${encodeURIComponent(imageId)}/history?hostId=${encodeURIComponent(hostId)}`, {
            headers,
        });
        return handleResponse<any[]>(response);
    },

    getContainerStats: async (hostId: string, containerId: string): Promise<any> => {
        const headers = await getHeadersForHost(hostId);
        const response = await fetch(`${API_BASE}/containers/${containerId}/stats?hostId=${encodeURIComponent(hostId)}`, {
            headers,
        });
        return handleResponse<any>(response);
    },

    testHostConnection: async (hostId: string): Promise<{ status: 'connected' | 'disconnected' | 'error'; error?: string }> => {
        const headers = await getHeadersForHost(hostId);
        const response = await fetch(`${API_BASE}/hosts/${hostId}/test`, {
            method: 'POST',
            headers,
        });
        return handleResponse<{ status: 'connected' | 'disconnected' | 'error'; error?: string }>(response);
    },

    testNewHostConnection: (name: string, type?: 'local' | 'remote', host?: string, port?: number, tls?: boolean, socketProxy?: boolean, apiKey?: string): Promise<{ status: 'connected' | 'disconnected' | 'error'; error?: string }> => {
        const headers = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return fetch(`${API_BASE}/hosts/test`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ name, type, host, port, tls, socketProxy, apiKey }),
        }).then(handleResponse) as Promise<{ status: 'connected' | 'disconnected' | 'error'; error?: string }>;
    },
};