import React, { useState, useEffect, useCallback } from 'react';
import { Host, ComposeProject, Container, ContainerState } from '../types';
import { dockerService } from '../services/dockerService';
import { ComposeFileEditor } from './ComposeFileEditor';

// --- Icon Components ---
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>;
const StopIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>;
const RefreshCwIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6"></path><path d="M21 12A9 9 0 0 0 6 5.3L3 8"></path><path d="M21 22v-6h-6"></path><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"></path></svg>;
const ChevronDown = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>;
const FileCodeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><polyline points="14 2 14 8 20 8"/><path d="m9 18 3-3-3-3"/><path d="m5 12-3 3 3 3"/></svg>;

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

const ActionButton: React.FC<{ onClick: (e: React.MouseEvent) => void; children: React.ReactNode; className: string; disabled?: boolean; title: string }> = ({ onClick, children, className, disabled, title }) => (
    <button onClick={onClick} disabled={disabled} title={title} className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors ${className} disabled:opacity-50 disabled:cursor-not-allowed`}>
        {children}
    </button>
);

interface ComposeViewProps {
  host: Host;
}

export const ComposeView: React.FC<ComposeViewProps> = ({ host }) => {
  const [projects, setProjects] = useState<ComposeProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [openProject, setOpenProject] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<ComposeProject | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dockerService.getComposeProjects(host.id);
      setProjects(data);
      if(data.length > 0 && !openProject) {
        setOpenProject(data[0].name);
      }
    } catch (e) {
      setError('Failed to fetch compose projects.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [host, openProject]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleProjectAction = async (e: React.MouseEvent, project: ComposeProject, action: 'start' | 'stop' | 'restart') => {
      e.stopPropagation();
      setProcessing(prev => ({...prev, [project.name]: true}));
      try {
          const actions = project.containers.map(c => {
            if(action === 'start' && c.state !== ContainerState.RUNNING) return dockerService.startContainer(host.id, c.id);
            if(action === 'stop' && c.state === ContainerState.RUNNING) return dockerService.stopContainer(host.id, c.id);
            if(action === 'restart') return dockerService.restartContainer(host.id, c.id);
            return Promise.resolve();
          });
          await Promise.all(actions);
          setTimeout(fetchData, 1200); // Give time for mock backend to process
      } catch (err) {
          console.error(`Failed to ${action} project`, err);
          setError(`Failed to ${action} project ${project.name}`);
      } finally {
          setProcessing(prev => ({...prev, [project.name]: false}));
      }
  };
  
  const handleSaveComposeFile = async (projectName: string, content: string) => {
    setProcessing(prev => ({...prev, [projectName]: true}));
    try {
        await dockerService.updateComposeFile(host.id, projectName, content);
        setEditingProject(null);
        await fetchData();
    } catch(e) {
        console.error('Failed to save compose file', e);
        setError(`Failed to save compose file for ${projectName}`);
    } finally {
        setProcessing(prev => ({...prev, [projectName]: false}));
    }
  };


  if (loading) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>;
  if (error) return <div className="text-red-500 text-center p-6">{error}</div>;

  return (
    <>
      <div className="p-4 md:p-6 space-y-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Compose Projects</h1>
        {projects.length === 0 && <p className="text-gray-500 dark:text-gray-400">No Docker Compose projects found on this host.</p>}
        <div className="space-y-3">
          {projects.map(project => (
            <div key={project.name} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <button onClick={() => setOpenProject(openProject === project.name ? null : project.name)} className="w-full flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700/80">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{project.name}</h2>
                  <ChevronDown />
              </button>
              {openProject === project.name && (
                  <div className="p-4">
                      <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                          <ActionButton title="Start All" onClick={(e) => handleProjectAction(e, project, 'start')} className="bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-500/20 dark:hover:bg-green-500/40 dark:text-green-400" disabled={processing[project.name]}><PlayIcon/><span>Start All</span></ActionButton>
                          <ActionButton title="Stop All" onClick={(e) => handleProjectAction(e, project, 'stop')} className="bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-500/20 dark:hover:bg-red-500/40 dark:text-red-400" disabled={processing[project.name]}><StopIcon/><span>Stop All</span></ActionButton>
                          <ActionButton title="Restart All" onClick={(e) => handleProjectAction(e, project, 'restart')} className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 dark:bg-yellow-500/20 dark:hover:bg-yellow-500/40 dark:text-yellow-400" disabled={processing[project.name]}><RefreshCwIcon/><span>Restart All</span></ActionButton>
                          <ActionButton title="View/Edit Compose" onClick={(e) => { e.stopPropagation(); setEditingProject(project); }} className="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 dark:bg-indigo-500/20 dark:hover:bg-indigo-500/40 dark:text-indigo-400" disabled={processing[project.name]}><FileCodeIcon/><span>View/Edit Compose</span></ActionButton>
                      </div>
                      <ul className="space-y-2">
                          {project.containers.map(c => (
                             <li key={c.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50">
                                 <span className="font-medium text-gray-900 dark:text-white">{c.name}</span>
                                 <StateBadge state={c.state}/>
                             </li>
                          ))}
                      </ul>
                  </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {editingProject && (
          <ComposeFileEditor 
              project={editingProject}
              onSave={handleSaveComposeFile}
              onClose={() => setEditingProject(null)}
              isSaving={processing[editingProject.name]}
          />
      )}
    </>
  );
};
