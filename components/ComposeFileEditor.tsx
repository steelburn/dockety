import React, { useState, useEffect } from 'react';
import { ComposeProject } from '../types';

interface ComposeFileEditorProps {
    project: ComposeProject;
    onClose: () => void;
    onSave: (projectName: string, content: string) => void;
    isSaving: boolean;
}

export const ComposeFileEditor: React.FC<ComposeFileEditorProps> = ({ project, onClose, onSave, isSaving }) => {
    const [content, setContent] = useState(project.composeFile);

    useEffect(() => {
        setContent(project.composeFile);
    }, [project]);

    const handleSave = () => {
        onSave(project.name, content);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-3xl h-full max-h-[85vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">docker-compose.yml: {project.name}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 dark:hover:text-white text-2xl leading-none">&times;</button>
                </header>
                <main className="flex-1 p-1 bg-gray-100 dark:bg-black/20">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full h-full bg-white dark:bg-[#1e1e1e] text-gray-800 dark:text-gray-300 font-mono text-sm p-4 border-none outline-none resize-none"
                    />
                </main>
                <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2">
                     <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md text-sm" disabled={isSaving}>Cancel</button>
                     <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm" disabled={isSaving}>
                         {isSaving ? 'Saving...' : 'Save Changes'}
                     </button>
                </footer>
            </div>
        </div>
    );
};
