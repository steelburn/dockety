import React, { useState } from 'react';

interface PullImageModalProps {
    onClose: () => void;
    onPull: (imageName: string) => void;
}

export const PullImageModal: React.FC<PullImageModalProps> = ({ onClose, onPull }) => {
    const [imageName, setImageName] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!imageName.trim()) {
            setError('Image name cannot be empty.');
            return;
        }
        if (!imageName.includes(':')) {
            setError('Please include a tag (e.g., "ubuntu:latest").');
            return;
        }
        setError('');
        onPull(imageName);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-lg"
                onClick={e => e.stopPropagation()}
            >
                <form onSubmit={handleSubmit}>
                    <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pull Image</h2>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-800 dark:hover:text-white text-2xl leading-none">&times;</button>
                    </header>
                    <main className="p-6 space-y-4">
                        <div>
                           <label htmlFor="image-name" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Image Name</label>
                           <input 
                                type="text"
                                id="image-name"
                                value={imageName}
                                onChange={(e) => setImageName(e.target.value)}
                                placeholder="e.g., redis:latest"
                                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                autoFocus
                           />
                           {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                        </div>
                    </main>
                    <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2">
                         <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md text-sm">Cancel</button>
                         <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm">Pull</button>
                    </footer>
                </form>
            </div>
        </div>
    );
};
