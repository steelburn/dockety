import React, { useState, useEffect, useCallback } from 'react';
import { Host, DockerStats, SystemInfo } from '../types';
import { dockerService } from '../services/dockerService';

const ServerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
const XCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>;
const AlertCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
const RefreshCwIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" /></svg>;

interface HostSummary {
    host: Host;
    stats?: DockerStats;
    systemInfo?: SystemInfo;
    loading: boolean;
    error?: string;
}

export const HostsView: React.FC = () => {
    const [hosts, setHosts] = useState<Host[]>([]);
    const [hostSummaries, setHostSummaries] = useState<Record<string, HostSummary>>({});
    const [loading, setLoading] = useState(true);

    const fetchHosts = useCallback(async () => {
        try {
            const fetchedHosts = await dockerService.getHosts();
            setHosts(fetchedHosts);

            // Initialize summaries for each host
            const summaries: Record<string, HostSummary> = {};
            fetchedHosts.forEach(host => {
                summaries[host.id] = { host, loading: false };
            });
            setHostSummaries(summaries);
        } catch (error) {
            console.error("Failed to fetch hosts:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchHostDetails = useCallback(async (hostId: string) => {
        setHostSummaries(prev => ({
            ...prev,
            [hostId]: { ...prev[hostId], loading: true, error: undefined }
        }));

        try {
            const [stats, systemInfo] = await Promise.all([
                dockerService.getStats(hostId),
                dockerService.getSystemInfo(hostId)
            ]);

            setHostSummaries(prev => ({
                ...prev,
                [hostId]: {
                    ...prev[hostId],
                    stats,
                    systemInfo,
                    loading: false
                }
            }));
        } catch (error) {
            console.error(`Failed to fetch details for host ${hostId}:`, error);
            setHostSummaries(prev => ({
                ...prev,
                [hostId]: {
                    ...prev[hostId],
                    loading: false,
                    error: error instanceof Error ? error.message : 'Failed to fetch host details'
                }
            }));
        }
    }, []);

    const refreshAllHosts = useCallback(async () => {
        for (const host of hosts) {
            await fetchHostDetails(host.id);
        }
    }, [hosts, fetchHostDetails]);

    useEffect(() => {
        fetchHosts();
    }, [fetchHosts]);

    useEffect(() => {
        if (hosts.length > 0) {
            refreshAllHosts();
        }
    }, [hosts, refreshAllHosts]);

    const getStatusIcon = (status: Host['status']) => {
        switch (status) {
            case 'connected':
                return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
            case 'disconnected':
                return <XCircleIcon className="w-4 h-4 text-red-500" />;
            case 'error':
                return <XCircleIcon className="w-4 h-4 text-red-500" />;
            default:
                return <AlertCircleIcon className="w-4 h-4 text-yellow-500" />;
        }
    };

    const getStatusColor = (status: Host['status']) => {
        switch (status) {
            case 'connected':
                return 'text-green-600 dark:text-green-400';
            case 'disconnected':
                return 'text-red-600 dark:text-red-400';
            case 'error':
                return 'text-red-600 dark:text-red-400';
            default:
                return 'text-yellow-600 dark:text-yellow-400';
        }
    };

    if (loading) {
        return (
            <div className="p-4 md:p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Hosts</h1>
                <button
                    onClick={refreshAllHosts}
                    className="flex items-center px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors duration-200"
                >
                    <RefreshCwIcon className="w-4 h-4 mr-2" />
                    Refresh All
                </button>
            </div>

            {hosts.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-center">
                    <ServerIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Hosts Configured</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        Add your first Docker host in the System view to get started.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {hosts.map(host => {
                        const summary = hostSummaries[host.id];
                        return (
                            <div key={host.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center">
                                        <ServerIcon className="w-5 h-5 mr-2 text-gray-500" />
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {host.name}
                                        </h3>
                                    </div>
                                    {getStatusIcon(host.status)}
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Type:</span>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                            {host.type}
                                        </span>
                                    </div>

                                    {host.type === 'remote' && (
                                        <>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600 dark:text-gray-400">Host:</span>
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {host.host}:{host.port}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600 dark:text-gray-400">TLS:</span>
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {host.tls ? 'Yes' : 'No'}
                                                </span>
                                            </div>
                                        </>
                                    )}

                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                                        <span className={`text-sm font-medium capitalize ${getStatusColor(host.status)}`}>
                                            {host.status}
                                        </span>
                                    </div>

                                    {host.lastChecked && (
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Last Checked:</span>
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                {new Date(host.lastChecked).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {summary?.loading ? (
                                    <div className="flex items-center justify-center py-4">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-500"></div>
                                    </div>
                                ) : summary?.error ? (
                                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                                        <p className="text-sm text-red-600 dark:text-red-400">
                                            {summary.error}
                                        </p>
                                    </div>
                                ) : summary?.stats && summary?.systemInfo ? (
                                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-600 dark:text-gray-400">Containers</p>
                                                <p className="font-semibold text-gray-900 dark:text-white">
                                                    {summary.stats.runningContainers} running
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                                    {summary.stats.totalContainers} total
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600 dark:text-gray-400">Images</p>
                                                <p className="font-semibold text-gray-900 dark:text-white">
                                                    {summary.stats.totalImages}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600 dark:text-gray-400">OS</p>
                                                <p className="font-semibold text-gray-900 dark:text-white">
                                                    {summary.systemInfo.os}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600 dark:text-gray-400">Memory</p>
                                                <p className="font-semibold text-gray-900 dark:text-white">
                                                    {summary.systemInfo.totalMemory}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => fetchHostDetails(host.id)}
                                        className="w-full py-2 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors duration-200 text-sm"
                                    >
                                        Load Details
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};