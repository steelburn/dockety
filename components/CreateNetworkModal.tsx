import React, { useState } from 'react';

interface CreateNetworkModalProps {
    onClose: () => void;
    onCreate: (name: string, driver: string) => void;
}

export const CreateNetworkModal: React.FC<CreateNetworkModalProps> = ({ onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [driver, setDriver] = useState('bridge');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Network name cannot be empty.');
            return;
        }
        setError('');
        onCreate(name, driver);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-lg"
                onClick={e => e.stopPropagation()}
            >
                <form onSubmit={handleSubmit}>
                    <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Network</h2>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-800 dark:hover:text-white text-2xl leading-none">&times;</button>
                    </header>
                    <main className="p-6 space-y-4">
                        <div>
                           <label htmlFor="network-name" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Network Name</label>
                           <input 
                                type="text"
                                id="network-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                autoFocus
                           />
                           {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                        </div>
                        <div>
                           <label htmlFor="network-driver" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Driver</label>
                           <select
                                id="network-driver"
                                value={driver}
                                onChange={(e) => setDriver(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500"
                           >
                                <option value="bridge">bridge</option>
                                <option value="overlay">overlay</option>
                                <option value="macvlan">macvlan</option>
                                <option value="host">host</option>
                           </select>
                        </div>
                    </main>
                    <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2">
                         <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md text-sm">Cancel</button>
                         <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm">Create</button>
                    </footer>
                </form>
            </div>
        </div>
    );
};
