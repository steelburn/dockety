import React, { useState, useEffect, useCallback } from 'react';
import { Host, ViewType } from './types';
import { dockerService } from './services/dockerService';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ContainersView } from './components/ContainersView';
import { ImagesView } from './components/ImagesView';
import { VolumesView } from './components/VolumesView';
import { NetworksView } from './components/NetworksView';
import { ComposeView } from './components/ComposeView';
import { HostsView } from './components/HostsView';
import { SystemView } from './components/SystemView';
import { Login } from './components/Login';
import { AboutView } from './components/AboutView';

export type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'dark');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; username: string; role: string; isApproved: boolean } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        setToken(token);
        setUser(user);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogin = useCallback((newToken: string, newUser: { id: string; username: string; role: string; isApproved: boolean }) => {
    setToken(newToken);
    setUser(newUser);
    setIsAuthenticated(true);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  }, []);

  const handleLogout = useCallback(() => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setHosts([]);
    setSelectedHost(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  const fetchHosts = useCallback(async () => {
    try {
      const fetchedHosts = await dockerService.getHosts();
      setHosts(fetchedHosts);

      // If no host is selected or selected host is removed, select the first one
      if (fetchedHosts.length > 0) {
        const currentSelectedStillExists = fetchedHosts.some(h => h.id === selectedHost?.id);
        if (!currentSelectedStillExists) {
          setSelectedHost(fetchedHosts[0]);
        }
      } else {
        setSelectedHost(null);
      }
    } catch (error) {
      console.error("Failed to fetch hosts:", error);
    }
  }, [selectedHost]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchHosts();
    }
  }, [isAuthenticated]); // Only fetch hosts when user becomes authenticated

  const handleAddHost = useCallback(async (name: string, type?: 'local' | 'remote', host?: string, port?: number, tls?: boolean, socketProxy?: boolean) => {
    await dockerService.addHost(name, type, host, port, tls, socketProxy);
    await fetchHosts();
  }, [fetchHosts]);

  const handleUpdateHost = useCallback(async (id: string, name: string, type?: 'local' | 'remote', host?: string, port?: number, tls?: boolean, socketProxy?: boolean) => {
    await dockerService.updateHost(id, name, type, host, port, tls, socketProxy);
    await fetchHosts();
  }, [fetchHosts]);

  const handleRemoveHost = useCallback(async (id: string) => {
    await dockerService.removeHost(id);
    await fetchHosts();
  }, [fetchHosts]);

  const toggleSidebar = useCallback(() => setIsSidebarOpen(prev => !prev), []);

  const renderView = () => {
    if (!selectedHost) {
      return (
        <div className="p-4 md:p-6">
          <SystemView
            host={selectedHost!}
            theme={theme}
            setTheme={setTheme}
            hosts={hosts}
            onAddHost={handleAddHost}
            onUpdateHost={handleUpdateHost}
            onRemoveHost={handleRemoveHost}
            currentUser={user}
          />
        </div>
      );
    }

    switch (currentView) {
      case 'dashboard':
        return <DashboardView host={selectedHost} />;
      case 'containers':
        return <ContainersView host={selectedHost} />;
      case 'images':
        return <ImagesView host={selectedHost} />;
      case 'volumes':
        return <VolumesView host={selectedHost} />;
      case 'networks':
        return <NetworksView host={selectedHost} />;
      case 'compose':
        return <ComposeView host={selectedHost} />;
      case 'hosts':
        return <HostsView />;
      case 'system':
        return <SystemView
          host={selectedHost}
          theme={theme}
          setTheme={setTheme}
          hosts={hosts}
          onAddHost={handleAddHost}
          onUpdateHost={handleUpdateHost}
          onRemoveHost={handleRemoveHost}
          currentUser={user}
        />;
      case 'about':
        return <AboutView />;
      default:
        return <div>Not Found</div>;
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans">
      <Sidebar currentView={currentView} setView={setCurrentView} isSidebarOpen={isSidebarOpen} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header
          hosts={hosts}
          selectedHost={selectedHost}
          setSelectedHost={setSelectedHost}
          toggleSidebar={toggleSidebar}
          user={user}
          onLogout={handleLogout}
        />
        <div className="flex-1 overflow-y-auto">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;
