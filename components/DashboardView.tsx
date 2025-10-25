import React, { useState, useEffect, useCallback } from 'react';
import { Host, DockerStats, SystemInfo } from '../types';
import { dockerService } from '../services/dockerService';
import { StatCard } from './StatCard';

const CubeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
);

const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);

const XCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
);

const LayersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
);

const DatabaseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
);

const Share2Icon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
);


interface DashboardViewProps {
  host: Host;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ host }) => {
  const [stats, setStats] = useState<DockerStats | null>(null);
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, infoData] = await Promise.all([
        dockerService.getStats(host.id),
        dockerService.getSystemInfo(host.id)
      ]);
      setStats(statsData);
      setInfo(infoData);
    } catch (e) {
      setError('Failed to fetch dashboard data.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [host]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  if (loading) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>;
  if (error) return <div className="text-red-500 text-center">{error}</div>;
  if (!stats || !info) return null;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard title="Running Containers" value={stats.runningContainers} icon={<CheckCircleIcon />} colorClass="bg-green-500/20 text-green-400" />
        <StatCard title="Stopped Containers" value={stats.stoppedContainers} icon={<XCircleIcon />} colorClass="bg-red-500/20 text-red-400" />
        <StatCard title="Total Containers" value={stats.totalContainers} icon={<CubeIcon />} colorClass="bg-blue-500/20 text-blue-400" />
        <StatCard title="Images" value={stats.totalImages} icon={<LayersIcon />} colorClass="bg-yellow-500/20 text-yellow-400" />
        <StatCard title="Volumes" value={stats.totalVolumes} icon={<DatabaseIcon />} colorClass="bg-purple-500/20 text-purple-400" />
        <StatCard title="Networks" value={stats.totalNetworks} icon={<Share2Icon />} colorClass="bg-indigo-500/20 text-indigo-400" />
      </div>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">System Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-gray-600 dark:text-gray-300">
            <div><span className="font-semibold text-gray-500 dark:text-gray-400">Docker Version:</span> {info.dockerVersion}</div>
            <div><span className="font-semibold text-gray-500 dark:text-gray-400">Operating System:</span> {info.os}</div>
            <div><span className="font-semibold text-gray-500 dark:text-gray-400">Architecture:</span> {info.architecture}</div>
            <div><span className="font-semibold text-gray-500 dark:text-gray-400">CPUs:</span> {info.cpus}</div>
            <div><span className="font-semibold text-gray-500 dark:text-gray-400">Total Memory:</span> {info.totalMemory}</div>
        </div>
      </div>
    </div>
  );
};
