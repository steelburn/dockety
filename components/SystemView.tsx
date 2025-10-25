import React, { useState, useCallback } from 'react';
import { Host, PruneReport } from '../types';
import { dockerService } from '../services/dockerService';
import { Theme } from '../App';
import { HostManager } from './HostManager';

interface SystemViewProps {
  host: Host;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  hosts: Host[];
  onAddHost: (name: string) => Promise<void>;
  onUpdateHost: (id: string, name: string) => Promise<void>;
  onRemoveHost: (id: string) => Promise<void>;
}

const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.93 17.66 1.41-1.41"/><path d="m17.66 4.93 1.41-1.41"/></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>;

export const SystemView: React.FC<SystemViewProps> = ({ host, theme, setTheme, hosts, onAddHost, onUpdateHost, onRemoveHost }) => {
  const [pruneVolumes, setPruneVolumes] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [report, setReport] = useState<PruneReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePrune = useCallback(async () => {
    if (!host) {
        setError("Please select a host first.");
        return;
    }
    setProcessing(true);
    setError(null);
    setReport(null);
    try {
      const pruneReport = await dockerService.pruneSystem(host.id, {
        volumes: pruneVolumes,
      });
      setReport(pruneReport);
    } catch (e) {
      console.error('Failed to prune system', e);
      setError('An error occurred while pruning the system.');
    } finally {
      setProcessing(false);
    }
  }, [host, pruneVolumes]);
  
  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System</h1>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Host Management</h2>
         <HostManager
            hosts={hosts}
            onAddHost={onAddHost}
            onUpdateHost={onUpdateHost}
            onRemoveHost={onRemoveHost}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Appearance</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Choose your preferred interface theme.
        </p>
         <div className="flex space-x-2">
          <button onClick={() => setTheme('light')} className={`px-4 py-2 rounded-md flex items-center space-x-2 text-sm ${theme === 'light' ? 'bg-sky-500 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
            <SunIcon />
            <span>Light</span>
          </button>
          <button onClick={() => setTheme('dark')} className={`px-4 py-2 rounded-md flex items-center space-x-2 text-sm ${theme === 'dark' ? 'bg-sky-500 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
            <MoonIcon />
            <span>Dark</span>
          </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">System Prune</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Remove all unused containers, networks, and dangling images. Optionally, remove unused volumes.
        </p>
        <div className="space-y-4">
            <div className="flex items-center">
                <input
                    id="prune-volumes"
                    type="checkbox"
                    checked={pruneVolumes}
                    onChange={(e) => setPruneVolumes(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-600 ring-offset-gray-100 dark:ring-offset-gray-800 focus:ring-2"
                />
                <label htmlFor="prune-volumes" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Prune unused volumes
                </label>
            </div>
            <button
                onClick={handlePrune}
                disabled={processing || !host}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {processing ? 'Pruning...' : 'Prune System'}
            </button>
        </div>
        
        {error && <div className="mt-4 text-red-500">{error}</div>}

        {report && (
            <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Prune Report</h3>
                <p className="text-green-600 dark:text-green-400 font-semibold">Total space reclaimed: {report.spaceReclaimed}</p>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mt-2">
                    <li>Stopped containers deleted: {report.itemsDeleted.containers}</li>
                    <li>Dangling images deleted: {report.itemsDeleted.images}</li>
                    <li>Unused volumes deleted: {report.itemsDeleted.volumes}</li>
                </ul>
            </div>
        )}
      </div>
    </div>
  );
};
