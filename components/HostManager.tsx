import React, { useState } from 'react';
import { Host } from '../types';
import { dockerService } from '../services/dockerService';

const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>;
const Trash2Icon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>;
const ServerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>;

interface HostManagerProps {
    hosts: Host[];
    onAddHost: (name: string, type?: 'local' | 'remote', host?: string, port?: number, tls?: boolean, socketProxy?: boolean, apiKey?: string) => Promise<void>;
    onUpdateHost: (id: string, name: string, type?: 'local' | 'remote', host?: string, port?: number, tls?: boolean, socketProxy?: boolean, apiKey?: string) => Promise<void>;
    onRemoveHost: (id: string) => Promise<void>;
}

export const HostManager: React.FC<HostManagerProps> = ({ hosts, onAddHost, onUpdateHost, onRemoveHost }) => {
    const [newHostName, setNewHostName] = useState('');
    const [newHostType, setNewHostType] = useState<'local' | 'remote'>('local');
    const [newHostAddress, setNewHostAddress] = useState('');
    const [newHostPort, setNewHostPort] = useState<number | ''>('');
    const [newHostTls, setNewHostTls] = useState(false);
    const [newHostSocketProxy, setNewHostSocketProxy] = useState(false);
    const [newHostApiKey, setNewHostApiKey] = useState('');
    const [testConnectionStatus, setTestConnectionStatus] = useState<{ loading: boolean; status?: 'connected' | 'disconnected' | 'error'; message?: string }>({ loading: false });
    const [editingHostId, setEditingHostId] = useState<string | null>(null);
    const [editingHostName, setEditingHostName] = useState('');
    const [editingHostType, setEditingHostType] = useState<'local' | 'remote'>('local');
    const [editingHostAddress, setEditingHostAddress] = useState('');
    const [editingHostPort, setEditingHostPort] = useState<number | ''>('');
    const [editingHostTls, setEditingHostTls] = useState(false);
    const [editingHostSocketProxy, setEditingHostSocketProxy] = useState(false);
    const [editingHostApiKey, setEditingHostApiKey] = useState('');
    const [processing, setProcessing] = useState<Record<string, boolean>>({});

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newHostName.trim()) return;

        setProcessing(prev => ({ ...prev, add: true }));
        await onAddHost(
            newHostName,
            newHostType,
            newHostType === 'remote' ? newHostAddress : undefined,
            newHostType === 'remote' && newHostPort ? newHostPort : undefined,
            newHostType === 'remote' ? newHostTls : undefined,
            newHostType === 'remote' ? newHostSocketProxy : undefined,
            newHostType === 'remote' && newHostSocketProxy ? newHostApiKey : undefined
        );
        setNewHostName('');
        setNewHostType('local');
        setNewHostAddress('');
        setNewHostPort('');
        setNewHostTls(false);
        setNewHostSocketProxy(false);
        setNewHostApiKey('');
        setTestConnectionStatus({ loading: false });
        setProcessing(prev => ({ ...prev, add: false }));
    };

    const handleEditStart = (host: Host) => {
        setEditingHostId(host.id);
        setEditingHostName(host.name);
        setEditingHostType(host.type || 'local');
        setEditingHostAddress(host.host || '');
        setEditingHostPort(host.port || '');
        setEditingHostTls(host.tls || false);
        setEditingHostSocketProxy(host.socketProxy || false);
        setEditingHostApiKey(host.apiKey || '');
    };

    const handleEditCancel = () => {
        setEditingHostId(null);
        setEditingHostName('');
        setEditingHostType('local');
        setEditingHostAddress('');
        setEditingHostPort('');
        setEditingHostTls(false);
        setEditingHostSocketProxy(false);
        setEditingHostApiKey('');
    };

    const handleEditSave = async () => {
        if (!editingHostId || !editingHostName.trim()) return;
        setProcessing(prev => ({ ...prev, [editingHostId]: true }));
        await onUpdateHost(
            editingHostId,
            editingHostName,
            editingHostType,
            editingHostType === 'remote' ? editingHostAddress : undefined,
            editingHostType === 'remote' && editingHostPort ? editingHostPort : undefined,
            editingHostType === 'remote' ? editingHostTls : undefined,
            editingHostType === 'remote' ? editingHostSocketProxy : undefined,
            editingHostType === 'remote' && editingHostSocketProxy ? editingHostApiKey : undefined
        );
        setEditingHostId(null);
        setEditingHostName('');
        setEditingHostType('local');
        setEditingHostAddress('');
        setEditingHostPort('');
        setEditingHostTls(false);
        setEditingHostSocketProxy(false);
        setEditingHostApiKey('');
        setProcessing(prev => ({ ...prev, [editingHostId]: false }));
    };

    const handleTestConnection = async (hostId: string) => {
        setProcessing(prev => ({ ...prev, [hostId]: true }));
        try {
            await dockerService.testHostConnection(hostId);
            // The status will be updated via the parent component's fetchHosts
        } catch (error) {
            console.error('Connection test failed:', error);
        } finally {
            setProcessing(prev => ({ ...prev, [hostId]: false }));
        }
    };

    const handleTestNewHostConnection = async () => {
        setTestConnectionStatus({ loading: true });
        try {
            const result = await dockerService.testNewHostConnection(
                newHostName,
                newHostType,
                newHostType === 'remote' ? newHostAddress : undefined,
                newHostType === 'remote' && newHostPort ? newHostPort : undefined,
                newHostType === 'remote' ? newHostTls : undefined,
                newHostType === 'remote' ? newHostSocketProxy : undefined,
                newHostType === 'remote' && newHostSocketProxy ? newHostApiKey : undefined
            );
            setTestConnectionStatus({
                loading: false,
                status: result.status,
                message: result.status === 'connected' ? 'Connection successful!' : result.error || 'Connection failed'
            });
        } catch (error) {
            setTestConnectionStatus({
                loading: false,
                status: 'error',
                message: error instanceof Error ? error.message : 'Connection test failed'
            });
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'connected':
                return <div className="w-2 h-2 bg-green-500 rounded-full" title="Connected"></div>;
            case 'disconnected':
                return <div className="w-2 h-2 bg-red-500 rounded-full" title="Disconnected"></div>;
            case 'error':
                return <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Error"></div>;
            default:
                return <div className="w-2 h-2 bg-gray-400 rounded-full" title="Unknown"></div>;
        }
    };

    const handleRemove = async (id: string) => {
        if (window.confirm('Are you sure you want to remove this host?')) {
            setProcessing(prev => ({ ...prev, [id]: true }));
            await onRemoveHost(id);
            // No need to set processing to false as the component might unmount
        }
    };

    return (
        <div className="space-y-4">
            <form onSubmit={handleAddSubmit} className="space-y-4 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add New Host</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                        <input
                            type="text"
                            value={newHostName}
                            onChange={(e) => setNewHostName(e.target.value)}
                            placeholder="Host name"
                            className="w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            disabled={!!processing['add']}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                        <select
                            value={newHostType}
                            onChange={(e) => setNewHostType(e.target.value as 'local' | 'remote')}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            disabled={!!processing['add']}
                        >
                            <option value="local">Local</option>
                            <option value="remote">Remote</option>
                        </select>
                    </div>
                    {newHostType === 'remote' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Host Address</label>
                                <input
                                    type="text"
                                    value={newHostAddress}
                                    onChange={(e) => setNewHostAddress(e.target.value)}
                                    placeholder="e.g., docker.example.com"
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    disabled={!!processing['add']}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Port</label>
                                <input
                                    type="number"
                                    value={newHostPort}
                                    onChange={(e) => setNewHostPort(e.target.value ? parseInt(e.target.value) : '')}
                                    placeholder="2376"
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    disabled={!!processing['add']}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={newHostTls}
                                        onChange={(e) => setNewHostTls(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-600 ring-offset-gray-100 dark:ring-offset-gray-800"
                                        disabled={!!processing['add']}
                                    />
                                    <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Use TLS</span>
                                </label>
                            </div>
                            <div className="md:col-span-2">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={newHostSocketProxy}
                                        onChange={(e) => setNewHostSocketProxy(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-600 ring-offset-gray-100 dark:ring-offset-gray-800"
                                        disabled={!!processing['add']}
                                    />
                                    <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Use Docker Socket Proxy</span>
                                </label>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Enable if connecting through a Docker Socket Proxy that removes API version from paths
                                </p>
                                {newHostSocketProxy && (
                                    <div className="mt-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</label>
                                        <input
                                            type="password"
                                            value={newHostApiKey}
                                            onChange={(e) => setNewHostApiKey(e.target.value)}
                                            placeholder="Enter API key for socket proxy authentication"
                                            className="w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                            disabled={!!processing['add']}
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <button
                            type="button"
                            onClick={handleTestNewHostConnection}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm disabled:opacity-50"
                            disabled={testConnectionStatus.loading || !newHostName.trim() || !!processing['add']}
                        >
                            {testConnectionStatus.loading ? 'Testing...' : 'Test Connection'}
                        </button>
                        {testConnectionStatus.status && (
                            <div className={`text-sm px-3 py-1 rounded-md ${testConnectionStatus.status === 'connected'
                                ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400'
                                }`}>
                                {testConnectionStatus.message}
                            </div>
                        )}
                    </div>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm disabled:opacity-50"
                        disabled={!newHostName.trim() || !!processing['add']}
                    >
                        {processing['add'] ? 'Adding...' : 'Add Host'}
                    </button>
                </div>
            </form>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">Managed Hosts</h3>
                <ul className="space-y-2">
                    {hosts.map(host => (
                        <li key={host.id} className="p-3 rounded-md bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                            {editingHostId === host.id ? (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                                            <input
                                                type="text"
                                                value={editingHostName}
                                                onChange={(e) => setEditingHostName(e.target.value)}
                                                className="w-full px-2 py-1 bg-white dark:bg-gray-600 border border-blue-500 text-sm rounded-md"
                                                autoFocus
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                                            <select
                                                value={editingHostType}
                                                onChange={(e) => setEditingHostType(e.target.value as 'local' | 'remote')}
                                                className="w-full px-2 py-1 bg-white dark:bg-gray-600 border border-blue-500 text-sm rounded-md"
                                            >
                                                <option value="local">Local</option>
                                                <option value="remote">Remote</option>
                                            </select>
                                        </div>
                                        {editingHostType === 'remote' && (
                                            <>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Host Address</label>
                                                    <input
                                                        type="text"
                                                        value={editingHostAddress}
                                                        onChange={(e) => setEditingHostAddress(e.target.value)}
                                                        placeholder="e.g., docker.example.com"
                                                        className="w-full px-2 py-1 bg-white dark:bg-gray-600 border border-blue-500 text-sm rounded-md"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Port</label>
                                                    <input
                                                        type="number"
                                                        value={editingHostPort}
                                                        onChange={(e) => setEditingHostPort(e.target.value ? parseInt(e.target.value) : '')}
                                                        placeholder="2376"
                                                        className="w-full px-2 py-1 bg-white dark:bg-gray-600 border border-blue-500 text-sm rounded-md"
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={editingHostTls}
                                                            onChange={(e) => setEditingHostTls(e.target.checked)}
                                                            className="w-4 h-4 text-blue-600 bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-600"
                                                        />
                                                        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Use TLS</span>
                                                    </label>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={editingHostSocketProxy}
                                                            onChange={(e) => setEditingHostSocketProxy(e.target.checked)}
                                                            className="w-4 h-4 text-blue-600 bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-600"
                                                        />
                                                        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Use Docker Socket Proxy</span>
                                                    </label>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                        Enable if connecting through a Docker Socket Proxy that removes API version from paths
                                                    </p>
                                                    {editingHostSocketProxy && (
                                                        <div className="mt-2">
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</label>
                                                            <input
                                                                type="password"
                                                                value={editingHostApiKey}
                                                                onChange={(e) => setEditingHostApiKey(e.target.value)}
                                                                placeholder="Enter API key for socket proxy authentication"
                                                                className="w-full px-2 py-1 bg-white dark:bg-gray-600 border border-blue-500 text-sm rounded-md"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex justify-end space-x-2">
                                        <button onClick={handleEditSave} title="Save" className="p-2 text-green-500 hover:bg-green-100 dark:hover:bg-green-500/20 rounded-md" disabled={processing[host.id]}><CheckIcon /></button>
                                        <button onClick={handleEditCancel} title="Cancel" className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-md"><XIcon /></button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        {getStatusIcon(host.status)}
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white">{host.name}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {host.type === 'remote' ?
                                                    `${host.host || 'N/A'}:${host.port || 'N/A'}${host.tls ? ' (TLS)' : ''}${host.socketProxy ? ' (Socket Proxy)' : ''}` :
                                                    'Local Docker Socket'
                                                }
                                                {host.lastChecked && (
                                                    <span className="ml-2">
                                                        • Last checked: {new Date(host.lastChecked).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button title="Test Connection" onClick={() => handleTestConnection(host.id)} className="p-2 bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-500/20 dark:hover:bg-green-500/40 dark:text-green-400 rounded-md" disabled={processing[host.id]}><PlayIcon /></button>
                                        <button title="Edit" onClick={() => handleEditStart(host)} className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-500/20 dark:hover:bg-blue-500/40 dark:text-blue-400 rounded-md" disabled={!!editingHostId}><EditIcon /></button>
                                        <button title="Remove" onClick={() => handleRemove(host.id)} className="p-2 bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-500/20 dark:hover:bg-red-500/40 dark:text-red-400 rounded-md" disabled={!!editingHostId || processing[host.id]}><Trash2Icon /></button>
                                    </div>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};
