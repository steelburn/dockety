import React from 'react';
import { ViewType } from '../types';

const LayoutDashboardIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>;
const CubeIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
const LayersIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>;
const DatabaseIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>;
const Share2Icon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>;
const Layers3Icon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className={className}><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.84l8.57 4.1a2 2 0 0 0 1.66 0l8.57-4.1a1 1 0 0 0 0-1.84Z"/><path d="m22 17.65-8.57 4.1a2 2 0 0 1-1.66 0L3.2 17.65"/><path d="m22 12.65-8.57 4.1a2 2 0 0 1-1.66 0L3.2 12.65"/></svg>;
const Settings2Icon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className={className}><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>;


const navItems: { view: ViewType, label: string, icon: React.ReactNode }[] = [
    { view: 'dashboard', label: 'Dashboard', icon: <LayoutDashboardIcon className="w-5 h-5" /> },
    { view: 'containers', label: 'Containers', icon: <CubeIcon className="w-5 h-5" /> },
    { view: 'compose', label: 'Compose', icon: <Layers3Icon className="w-5 h-5" /> },
    { view: 'images', label: 'Images', icon: <LayersIcon className="w-5 h-5" /> },
    { view: 'volumes', label: 'Volumes', icon: <DatabaseIcon className="w-5 h-5" /> },
    { view: 'networks', label: 'Networks', icon: <Share2Icon className="w-5 h-5" /> },
    { view: 'system', label: 'System', icon: <Settings2Icon className="w-5 h-5" /> },
];

interface SidebarProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  isSidebarOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isSidebarOpen }) => {
  return (
    <aside className={`bg-white dark:bg-gray-800/50 backdrop-blur-sm text-gray-800 dark:text-white transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'} h-full flex flex-col fixed md:relative z-20 shadow-lg dark:shadow-none`}>
        <div className="p-4 flex items-center justify-center border-b border-gray-200 dark:border-gray-700 h-16">
            <svg className={`w-8 h-8 transition-transform duration-500 ${isSidebarOpen ? 'rotate-0' : '-rotate-180'}`} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M49.4925 10.5375C42.2325 10.5375 36.165 14.07 32.895 19.56L13.125 19.56C11.535 19.56 10.215 20.88 10.215 22.47V77.52C10.215 79.11 11.535 80.43 13.125 80.43H32.895C36.165 85.92 42.2325 89.46 49.4925 89.46C56.7525 89.46 62.82 85.92 66.09 80.43H85.86C87.45 80.43 88.77 79.11 88.77 77.52V22.47C88.77 20.88 87.45 19.56 85.86 19.56H66.09C62.82 14.07 56.7525 10.53 49.4925 10.5375Z" stroke="#38BDF8" strokeWidth="5"/>
            </svg>
            <h1 className={`text-xl font-bold text-sky-500 dark:text-sky-400 ml-2 overflow-hidden whitespace-nowrap transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>Dockety</h1>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-2">
            {navItems.map(item => (
                <button 
                    key={item.view} 
                    onClick={() => setView(item.view)}
                    className={`w-full flex items-center p-3 rounded-lg transition-colors duration-200 ${
                        currentView === item.view 
                        ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-300' 
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    {item.icon}
                    <span className={`ml-4 font-medium overflow-hidden whitespace-nowrap transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>{item.label}</span>
                </button>
            ))}
        </nav>
    </aside>
  );
};
