import React, { useState, useEffect, useCallback } from 'react';
import { Host, DockerStats, SystemInfo, Container, ContainerState, ComposeProject } from '../types';
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

const ActivityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);


interface DashboardViewProps {
  host: Host;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ host }) => {
  const [stats, setStats] = useState<DockerStats | null>(null);
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [containers, setContainers] = useState<Container[]>([]);
  const [composeProjects, setComposeProjects] = useState<ComposeProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, infoData, containersData, composeData] = await Promise.all([
        dockerService.getStats(host.id),
        dockerService.getSystemInfo(host.id),
        dockerService.getContainers(host.id),
        dockerService.getComposeProjects(host.id)
      ]);
      setStats(statsData);
      setInfo(infoData);
      setContainers(containersData);
      setComposeProjects(composeData);
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

  const getRecentContainers = () => {
    return containers
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
      .slice(0, 5);
  };

  const getSystemHealth = () => {
    if (!stats || !info) return { status: 'unknown', message: 'Loading...' };

    const issues = [];
    if (stats.runningContainers === 0) issues.push('No running containers');
    if (stats.totalImages === 0) issues.push('No images available');

    if (issues.length === 0) {
      return { status: 'healthy', message: 'All systems operational' };
    } else {
      return { status: 'warning', message: issues.join(', ') };
    }
  };

  if (loading) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>;
  if (error) return <div className="text-red-500 text-center">{error}</div>;
  if (!stats || !info) return null;

  const recentContainers = getRecentContainers();
  const systemHealth = getSystemHealth();

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${systemHealth.status === 'healthy' ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400' :
          systemHealth.status === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400' :
            'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-400'
          }`}>
          <div className="flex items-center space-x-2">
            {systemHealth.status === 'healthy' ? <CheckCircleIcon /> : <ActivityIcon />}
            <span>{systemHealth.message}</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard title="Running Containers" value={stats.runningContainers} icon={<CheckCircleIcon />} colorClass="bg-green-500/20 text-green-400" />
        <StatCard title="Stopped Containers" value={stats.stoppedContainers} icon={<XCircleIcon />} colorClass="bg-red-500/20 text-red-400" />
        <StatCard title="Total Containers" value={stats.totalContainers} icon={<CubeIcon />} colorClass="bg-blue-500/20 text-blue-400" />
        <StatCard title="Images" value={stats.totalImages} icon={<LayersIcon />} colorClass="bg-yellow-500/20 text-yellow-400" />
        <StatCard title="Volumes" value={stats.totalVolumes} icon={<DatabaseIcon />} colorClass="bg-purple-500/20 text-purple-400" />
        <StatCard title="Networks" value={stats.totalNetworks} icon={<Share2Icon />} colorClass="bg-indigo-500/20 text-indigo-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
            <ClockIcon />
            <span className="ml-2">Recent Containers</span>
          </h2>
          <div className="space-y-3">
            {recentContainers.length > 0 ? (
              recentContainers.map((container) => (
                <div key={container.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${container.state === ContainerState.RUNNING ? 'bg-green-500' :
                      container.state === ContainerState.EXITED ? 'bg-red-500' :
                        'bg-yellow-500'
                      }`}></div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{container.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{container.image}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 text-xs rounded-full ${container.state === ContainerState.RUNNING ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400' :
                      container.state === ContainerState.EXITED ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400'
                      }`}>
                      {container.state}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">No containers found</p>
            )}
          </div>
        </div>

        {/* Compose Projects */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
            <LayersIcon />
            <span className="ml-2">Compose Projects</span>
          </h2>
          <div className="space-y-3">
            {composeProjects.length > 0 ? (
              composeProjects.map((project) => (
                <div key={project.name} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">{project.name}</h3>
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400 rounded-full">
                      {project.containers.length} containers
                    </span>
                  </div>
                  <div className="space-y-1">
                    {project.containers.slice(0, 3).map((container) => (
                      <div key={container.id} className="flex items-center space-x-2 text-sm">
                        <div className={`w-2 h-2 rounded-full ${container.state === ContainerState.RUNNING ? 'bg-green-500' : 'bg-gray-400'
                          }`}></div>
                        <span className="text-gray-600 dark:text-gray-300">{container.name}</span>
                      </div>
                    ))}
                    {project.containers.length > 3 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        +{project.containers.length - 3} more containers
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">No compose projects found</p>
            )}
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">System Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-gray-600 dark:text-gray-300">
          <div><span className="font-semibold text-gray-500 dark:text-gray-400">Docker Version:</span> {info.dockerVersion}</div>
          <div><span className="font-semibold text-gray-500 dark:text-gray-400">Operating System:</span> {info.os}</div>
          <div><span className="font-semibold text-gray-500 dark:text-gray-400">Architecture:</span> {info.architecture}</div>
          <div><span className="font-semibold text-gray-500 dark:text-gray-400">CPUs:</span> {info.cpus}</div>
          <div><span className="font-semibold text-gray-500 dark:text-gray-400">Total Memory:</span> {info.totalMemory}</div>
          <div><span className="font-semibold text-gray-500 dark:text-gray-400">Host:</span> {host.name}</div>
        </div>
      </div>
    </div>
  );
};
