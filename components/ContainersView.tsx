import React, { useState, useEffect, useCallback } from 'react';
import { useTable } from '../hooks/useTable';
import { Host, Container, ContainerState } from '../types';
import { dockerService } from '../services/dockerService';
import { LogViewer } from './LogViewer';
import { ConsoleTerminal } from './ConsoleTerminal';


// --- Icon Components ---
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>;
const StopIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>;
const RefreshCwIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6"></path><path d="M21 12A9 9 0 0 0 6 5.3L3 8"></path><path d="M21 22v-6h-6"></path><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"></path></svg>;
const Trash2Icon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const FileTextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
const TerminalIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>;
const ExternalLinkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>;

// --- Helper Components ---
const StateBadge: React.FC<{ state: ContainerState }> = ({ state }) => {
  const stateClasses: Record<ContainerState, string> = {
    [ContainerState.RUNNING]: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400',
    [ContainerState.EXITED]: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400',
    [ContainerState.CREATED]: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400',
    [ContainerState.RESTARTING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400 animate-pulse',
    [ContainerState.PAUSED]: 'bg-gray-200 text-gray-800 dark:bg-gray-500/20 dark:text-gray-400',
    [ContainerState.DEAD]: 'bg-gray-700 text-gray-100 dark:bg-black/20 dark:text-gray-500',
  };
  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${stateClasses[state]}`}>{state}</span>;
};

const ActionButton: React.FC<{ onClick: () => void; children: React.ReactNode; className: string; disabled?: boolean; title: string }> = ({ onClick, children, className, disabled, title }) => (
    <button onClick={onClick} disabled={disabled} title={title} className={`p-2 rounded-md transition-colors ${className} disabled:opacity-50 disabled:cursor-not-allowed`}>
        {children}
    </button>
);

const SortableHeader: React.FC<{
  sortKey: keyof Container;
  title: string;
  requestSort: (key: keyof Container) => void;
  sortConfig: { key: keyof Container | null; direction: 'ascending' | 'descending' };
}> = ({ sortKey, title, requestSort, sortConfig }) => {
  const isSorted = sortConfig.key === sortKey;
  return (
    <th scope="col" className="px-6 py-3">
      <button
        onClick={() => requestSort(sortKey)}
        className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 uppercase hover:text-gray-900 dark:hover:text-white"
      >
        <span>{title}</span>
        {isSorted && <span>{sortConfig.direction === 'ascending' ? '▲' : '▼'}</span>}
      </button>
    </th>
  );
};


// --- Main View Component ---
interface ContainersViewProps {
  host: Host;
}

export const ContainersView: React.FC<ContainersViewProps> = ({ host }) => {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [logViewerOpen, setLogViewerOpen] = useState<Container | null>(null);
  const [consoleOpen, setConsoleOpen] = useState<Container | null>(null);
  const { items, requestSort, sortConfig, searchTerm, handleSearchChange } = useTable(containers, ['name', 'image']);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dockerService.getContainers(host.id);
      setContainers(data);
    } catch (e) {
      setError('Failed to fetch containers.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [host]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (containerId: string, action: () => Promise<void>) => {
    setProcessing(prev => ({ ...prev, [containerId]: true }));
    try {
      await action();
      // A small delay to allow the mock backend to update state
      setTimeout(fetchData, 500);
    } catch (e) {
      console.error('Action failed:', e);
      setError('An action on a container failed.');
    } finally {
      setProcessing(prev => ({ ...prev, [containerId]: false }));
    }
  };
  
  const openPort = (port: number) => {
    window.open(`http://localhost:${port}`, '_blank', 'noopener,noreferrer');
  };

  if (loading) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>;
  if (error) return <div className="text-red-500 text-center p-6">{error}</div>;

  return (
    <>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Containers</h1>
          <div className="flex items-center space-x-2">
            <input
                type="text"
                placeholder="Filter containers..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="px-3 py-2 bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
            <button onClick={() => fetchData()} disabled={loading} className="p-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"><RefreshCwIcon/></button>
          </div>
        </div>
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <table className="min-w-full text-sm text-left text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <SortableHeader sortKey="name" title="Name" requestSort={requestSort} sortConfig={sortConfig} />
                <SortableHeader sortKey="state" title="State" requestSort={requestSort} sortConfig={sortConfig} />
                <SortableHeader sortKey="image" title="Image" requestSort={requestSort} sortConfig={sortConfig} />
                <th scope="col" className="px-6 py-3 text-xs text-gray-500 dark:text-gray-400 uppercase">Ports</th>
                <th scope="col" className="px-6 py-3 text-xs text-gray-500 dark:text-gray-400 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((container) => (
                <tr key={container.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{container.name}</td>
                  <td className="px-6 py-4"><StateBadge state={container.state} /></td>
                  <td className="px-6 py-4">{container.image}</td>
                  <td className="px-6 py-4">
                    {container.ports.length > 0 ? (
                        container.ports.map(p => (
                            <div key={`${p.publicPort}-${p.privatePort}`} className="flex items-center space-x-2">
                                <span className="font-mono text-xs bg-gray-200 dark:bg-gray-700/60 px-2 py-1 rounded-md">
                                    {p.publicPort ? `${p.publicPort}:${p.privatePort}/${p.type}` : `${p.privatePort}/${p.type}`}
                                </span>
                                {p.publicPort && (
                                    <button onClick={() => openPort(p.publicPort!)} title={`Open port ${p.publicPort}`} className="text-sky-500 dark:text-sky-400 hover:text-sky-600 dark:hover:text-sky-300">
                                        <ExternalLinkIcon/>
                                    </button>
                                )}
                            </div>
                        ))
                    ) : (
                        <span className="text-gray-400 dark:text-gray-500">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <ActionButton title="Logs" onClick={() => setLogViewerOpen(container)} className="bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-500/20 dark:hover:bg-blue-500/40 dark:text-blue-400" disabled={processing[container.id]}><FileTextIcon /></ActionButton>
                       <ActionButton title="Console" onClick={() => setConsoleOpen(container)} className="bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-500/20 dark:hover:bg-purple-500/40 dark:text-purple-400" disabled={processing[container.id] || container.state !== ContainerState.RUNNING}><TerminalIcon /></ActionButton>
                      
                      {container.state !== ContainerState.RUNNING && (
                          <ActionButton title="Start" onClick={() => handleAction(container.id, () => dockerService.startContainer(host.id, container.id))} className="bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-500/20 dark:hover:bg-green-500/40 dark:text-green-400" disabled={processing[container.id]}><PlayIcon /></ActionButton>
                      )}
                      {container.state === ContainerState.RUNNING && (
                          <ActionButton title="Stop" onClick={() => handleAction(container.id, () => dockerService.stopContainer(host.id, container.id))} className="bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-500/20 dark:hover:bg-red-500/40 dark:text-red-400" disabled={processing[container.id]}><StopIcon /></ActionButton>
                      )}
                      <ActionButton title="Restart" onClick={() => handleAction(container.id, () => dockerService.restartContainer(host.id, container.id))} className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 dark:bg-yellow-500/20 dark:hover:bg-yellow-500/40 dark:text-yellow-400" disabled={processing[container.id]}><RefreshCwIcon /></ActionButton>
                      <ActionButton title="Remove" onClick={() => handleAction(container.id, () => dockerService.removeContainer(host.id, container.id))} className="bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-500/20 dark:hover:bg-gray-500/40 dark:text-gray-400" disabled={processing[container.id]}><Trash2Icon /></ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {logViewerOpen && <LogViewer host={host} container={logViewerOpen} onClose={() => setLogViewerOpen(null)} />}
      {consoleOpen && <ConsoleTerminal host={host} container={consoleOpen} onClose={() => setConsoleOpen(null)} />}
    </>
  );
};
