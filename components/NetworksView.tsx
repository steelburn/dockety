import React, { useState, useEffect, useCallback, Fragment } from 'react';
import { useTable } from '../hooks/useTable';
import { Host, Network } from '../types';
import { dockerService } from '../services/dockerService';
import { CreateNetworkModal } from './CreateNetworkModal';

const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>;
const CubeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
const Layers3Icon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.84l8.57 4.1a2 2 0 0 0 1.66 0l8.57-4.1a1 1 0 0 0 0-1.84Z" /><path d="m22 17.65-8.57 4.1a2 2 0 0 1-1.66 0L3.2 17.65" /><path d="m22 12.65-8.57 4.1a2 2 0 0 1-1.66 0L3.2 12.65" /></svg>;
const PlusCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>;

const SortableHeader: React.FC<{
  sortKey: keyof Network;
  title: string;
  requestSort: (key: keyof Network) => void;
  sortConfig: { key: keyof Network | null; direction: 'ascending' | 'descending' };
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

interface NetworksViewProps {
  host: Host;
}

export const NetworksView: React.FC<NetworksViewProps> = ({ host }) => {
  const [networks, setNetworks] = useState<Network[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNetwork, setExpandedNetwork] = useState<string | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const { items, requestSort, sortConfig, searchTerm, handleSearchChange } = useTable(networks, ['name', 'driver', 'scope', 'id'], 'name');


  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dockerService.getNetworks(host.id);
      setNetworks(data);
    } catch (e) {
      setError('Failed to fetch networks.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [host]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateNetwork = async (name: string, driver: string, options: { subnet?: string; gateway?: string; ipRange?: string; labels?: Record<string, string> }) => {
    setCreateModalOpen(false);
    setLoading(true);
    try {
      await dockerService.createNetwork(host.id, name, driver, options);
      await fetchData();
    } catch (e) {
      setError('Failed to create network.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNetwork = async (networkId: string, networkName: string) => {
    if (!confirm(`Are you sure you want to delete network "${networkName}"? This action cannot be undone.`)) {
      return;
    }
    setLoading(true);
    try {
      await dockerService.deleteNetwork(host.id, networkId);
      await fetchData();
    } catch (e) {
      setError('Failed to delete network.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>;
  if (error) return <div className="text-red-500 text-center p-6">{error}</div>;

  return (
    <>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Networks</h1>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Filter networks..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="px-3 py-2 bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
            <button onClick={() => setCreateModalOpen(true)} className="flex items-center space-x-2 px-3 py-2 text-sm text-white rounded-md bg-green-600 hover:bg-green-700 transition-colors">
              <PlusCircleIcon />
              <span>Create Network</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <table className="min-w-full text-sm text-left text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th scope="col" className="px-2 py-3 w-12"></th>
                <SortableHeader sortKey="name" title="Name" requestSort={requestSort} sortConfig={sortConfig} />
                <SortableHeader sortKey="driver" title="Driver" requestSort={requestSort} sortConfig={sortConfig} />
                <SortableHeader sortKey="scope" title="Scope" requestSort={requestSort} sortConfig={sortConfig} />
                <SortableHeader sortKey="id" title="Network ID" requestSort={requestSort} sortConfig={sortConfig} />
                <th scope="col" className="px-6 py-3 w-16">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((network) => {
                // Don't show delete button for system networks
                const isSystemNetwork = ['bridge', 'host', 'none'].includes(network.name) || network.scope === 'swarm';
                return (
                  <Fragment key={network.id}>
                    <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40">
                      <td className="px-2 py-4">
                        {(network.containers.length > 0 || network.composeProjects.length > 0) && (
                          <button onClick={() => setExpandedNetwork(expandedNetwork === network.id ? null : network.id)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
                            <ChevronDownIcon />
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{network.name}</td>
                      <td className="px-6 py-4">{network.driver}</td>
                      <td className="px-6 py-4">{network.scope}</td>
                      <td className="px-6 py-4 font-mono text-xs">{network.id}</td>
                      <td className="px-6 py-4">
                        {!isSystemNetwork && (
                          <button
                            onClick={() => handleDeleteNetwork(network.id, network.name)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            title="Delete network"
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedNetwork === network.id && (
                      <tr className="bg-gray-100/50 dark:bg-gray-700/20">
                        <td colSpan={6} className="p-4">
                          <div className="pl-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {network.composeProjects.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Compose Projects:</h4>
                                <ul className="list-disc list-inside text-gray-600 dark:text-gray-400">
                                  {network.composeProjects.map(name => (
                                    <li key={name} className="flex items-center space-x-2">
                                      <Layers3Icon /> <span>{name}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {network.containers.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Containers:</h4>
                                <ul className="list-disc list-inside text-gray-600 dark:text-gray-400">
                                  {network.containers.map(name => (
                                    <li key={name} className="flex items-center space-x-2">
                                      <CubeIcon /> <span>{name}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {isCreateModalOpen && <CreateNetworkModal onCreate={handleCreateNetwork} onClose={() => setCreateModalOpen(false)} />}
    </>
  );
};
