import React from 'react';
import { Host } from '../types';

const ServerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>;

const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>;


interface HeaderProps {
  hosts: Host[];
  selectedHost: Host | null;
  setSelectedHost: (host: Host) => void;
  toggleSidebar: () => void;
  user: { id: string; username: string } | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ hosts, selectedHost, setSelectedHost, toggleSidebar, user, onLogout }) => {
  const handleHostChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const host = hosts.find(h => h.id === event.target.value);
    if (host) {
      setSelectedHost(host);
    }
  };

  return (
    <header className="flex items-center justify-between p-4 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 h-16">
      <div className="flex items-center">
        <button onClick={toggleSidebar} className="md:hidden p-2 mr-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
          <MenuIcon />
        </button>
        <div className="flex items-center space-x-2">
          <ServerIcon />
          <span className="text-gray-500 dark:text-gray-400">Host:</span>
          {hosts.length > 0 && selectedHost ? (
            <select
              value={selectedHost.id}
              onChange={handleHostChange}
              className="bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
            >
              {hosts.map(host => (
                <option key={host.id} value={host.id}>{host.name}</option>
              ))}
            </select>
          ) : (
            <span className="text-gray-900 dark:text-white font-semibold">Loading...</span>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-4">
        {user && (
          <>
            <span className="text-gray-900 dark:text-white">Welcome, {user.username}</span>
            <button
              onClick={onLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
};
