import React, { useState } from 'react';
import { Host } from '../types';

const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
const Trash2Icon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

interface HostManagerProps {
    hosts: Host[];
    onAddHost: (name: string) => Promise<void>;
    onUpdateHost: (id: string, name: string) => Promise<void>;
    onRemoveHost: (id: string) => Promise<void>;
}

export const HostManager: React.FC<HostManagerProps> = ({ hosts, onAddHost, onUpdateHost, onRemoveHost }) => {
    const [newHostName, setNewHostName] = useState('');
    const [editingHostId, setEditingHostId] = useState<string | null>(null);
    const [editingHostName, setEditingHostName] = useState('');
    const [processing, setProcessing] = useState<Record<string, boolean>>({});
    
    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newHostName.trim()) return;
        
        setProcessing(prev => ({...prev, add: true}));
        await onAddHost(newHostName);
        setNewHostName('');
        setProcessing(prev => ({...prev, add: false}));
    };

    const handleEditStart = (host: Host) => {
        setEditingHostId(host.id);
        setEditingHostName(host.name);
    };

    const handleEditCancel = () => {
        setEditingHostId(null);
        setEditingHostName('');
    };

    const handleEditSave = async () => {
        if (!editingHostId || !editingHostName.trim()) return;
        setProcessing(prev => ({...prev, [editingHostId]: true}));
        await onUpdateHost(editingHostId, editingHostName);
        setEditingHostId(null);
        setEditingHostName('');
        setProcessing(prev => ({...prev, [editingHostId]: false}));
    };

    const handleRemove = async (id: string) => {
        if (window.confirm('Are you sure you want to remove this host?')) {
            setProcessing(prev => ({...prev, [id]: true}));
            await onRemoveHost(id);
            // No need to set processing to false as the component might unmount
        }
    };

    return (
        <div className="space-y-4">
            <form onSubmit={handleAddSubmit} className="flex space-x-2">
                <input
                    type="text"
                    value={newHostName}
                    onChange={(e) => setNewHostName(e.target.value)}
                    placeholder="Enter new host name"
                    className="flex-grow px-3 py-2 bg-gray-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    disabled={!!processing['add']}
                />
                <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm disabled:opacity-50"
                    disabled={!newHostName.trim() || !!processing['add']}
                >
                    {processing['add'] ? 'Adding...' : 'Add Host'}
                </button>
            </form>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">Managed Hosts</h3>
                <ul className="space-y-2">
                    {hosts.map(host => (
                        <li key={host.id} className="flex items-center justify-between p-2 rounded-md bg-gray-100 dark:bg-gray-700/50">
                            {editingHostId === host.id ? (
                                <input
                                    type="text"
                                    value={editingHostName}
                                    onChange={(e) => setEditingHostName(e.target.value)}
                                    className="flex-grow px-2 py-1 bg-white dark:bg-gray-600 border border-blue-500 text-sm rounded-md"
                                    autoFocus
                                />
                            ) : (
                                <span className="text-gray-900 dark:text-white">{host.name}</span>
                            )}
                            
                            <div className="flex items-center space-x-2">
                                {editingHostId === host.id ? (
                                    <>
                                        <button onClick={handleEditSave} title="Save" className="p-2 text-green-500 hover:bg-green-100 dark:hover:bg-green-500/20 rounded-md" disabled={processing[host.id]}><CheckIcon/></button>
                                        <button onClick={handleEditCancel} title="Cancel" className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-md"><XIcon/></button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => handleEditStart(host)} title="Edit" className="p-2 text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md" disabled={!!editingHostId}><EditIcon/></button>
                                        <button onClick={() => handleRemove(host.id)} title="Remove" className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-md" disabled={!!editingHostId || processing[host.id]}><Trash2Icon/></button>
                                    </>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};
