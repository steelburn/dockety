import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Host, Container } from '../types';
import { dockerService } from '../services/dockerService';

interface LogViewerProps {
    host: Host;
    container: Container;
    onClose: () => void;
}

export const LogViewer: React.FC<LogViewerProps> = ({ host, container, onClose }) => {
    const [logs, setLogs] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const logContainerRef = useRef<HTMLDivElement>(null);
    const isAtBottomRef = useRef(true);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const logData = await dockerService.getContainerLogs(host.id, container.id);
            setLogs(logData);
        } catch (e) {
            console.error('Failed to fetch logs', e);
            setError('Could not load logs for this container.');
        } finally {
            setLoading(false);
        }
    }, [host.id, container.id]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    useEffect(() => {
        if (!isStreaming) return;

        const streamLogs = async () => {
            try {
                const newLogData = await dockerService.getNewContainerLogs(host.id, container.id);
                if (newLogData) {
                    setLogs(prev => prev + '\n' + newLogData);
                }
            } catch (e) {
                console.error('Failed to stream logs', e);
                // Optional: set an error state for streaming
            }
        };

        const intervalId = setInterval(streamLogs, 2500);

        return () => clearInterval(intervalId);
    }, [isStreaming, host.id, container.id]);

    const handleScroll = () => {
        if (logContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
            // Check if user is at the bottom (with a small tolerance)
            isAtBottomRef.current = scrollHeight - scrollTop <= clientHeight + 5;
        }
    };

    useEffect(() => {
        const logEl = logContainerRef.current;
        if (logEl && isAtBottomRef.current) {
            logEl.scrollTop = logEl.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl h-full max-h-[80vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Logs: {container.name}</h2>
                    <div className="flex items-center space-x-4">
                        <label htmlFor="live-stream-toggle" className="flex items-center cursor-pointer">
                            <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">Live Stream</span>
                            <div className="relative">
                                <input type="checkbox" id="live-stream-toggle" className="sr-only" checked={isStreaming} onChange={() => setIsStreaming(!isStreaming)} />
                                <div className={`block w-10 h-6 rounded-full ${isStreaming ? 'bg-blue-600' : 'bg-gray-400 dark:bg-gray-600'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isStreaming ? 'translate-x-4' : ''}`}></div>
                            </div>
                        </label>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-800 dark:hover:text-white text-2xl leading-none">&times;</button>
                    </div>
                </header>
                <main ref={logContainerRef} onScroll={handleScroll} className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-black/50">
                    {loading && <div className="text-center text-gray-500 dark:text-gray-400">Loading logs...</div>}
                    {error && <div className="text-center text-red-500">{error}</div>}
                    {!loading && !error && (
                        <pre className="text-xs text-gray-800 dark:text-gray-300 whitespace-pre-wrap font-mono">{logs}</pre>
                    )}
                </main>
                <footer className="p-2 border-t border-gray-200 dark:border-gray-700 text-right">
                     <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md text-sm">Close</button>
                </footer>
            </div>
        </div>
    );
};
