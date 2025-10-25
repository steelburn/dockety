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
import { SystemView } from './components/SystemView';

export type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'dark');

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

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
    fetchHosts();
  }, []); // Only on initial mount
  
  const handleAddHost = useCallback(async (name: string) => {
      await dockerService.addHost(name);
      await fetchHosts();
  }, [fetchHosts]);

  const handleUpdateHost = useCallback(async (id: string, name: string) => {
      await dockerService.updateHost(id, name);
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
      case 'system':
        return <SystemView 
                  host={selectedHost} 
                  theme={theme} 
                  setTheme={setTheme}
                  hosts={hosts}
                  onAddHost={handleAddHost}
                  onUpdateHost={handleUpdateHost}
                  onRemoveHost={handleRemoveHost}
                />;
      default:
        return <div>Not Found</div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans">
      <Sidebar currentView={currentView} setView={setCurrentView} isSidebarOpen={isSidebarOpen}/>
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          hosts={hosts} 
          selectedHost={selectedHost} 
          setSelectedHost={setSelectedHost}
          toggleSidebar={toggleSidebar}
        />
        <div className="flex-1 overflow-y-auto">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;
