import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Host, Container } from '../types';
import { dockerService } from '../services/dockerService';

interface ConsoleTerminalProps {
    host: Host;
    container: Container;
    onClose: () => void;
}

export const ConsoleTerminal: React.FC<ConsoleTerminalProps> = ({ host, container, onClose }) => {
    const [history, setHistory] = useState<string[]>([`Connected to ${container.name}. Type commands to execute.`]);
    const [input, setInput] = useState('');
    const [executing, setExecuting] = useState(false);
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (commandHistory.length > 0) {
                const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
                setHistoryIndex(newIndex);
                setInput(commandHistory[newIndex]);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex >= 0) {
                const newIndex = historyIndex + 1;
                if (newIndex >= commandHistory.length) {
                    setHistoryIndex(-1);
                    setInput('');
                } else {
                    setHistoryIndex(newIndex);
                    setInput(commandHistory[newIndex]);
                }
            }
        }
    }, [commandHistory, historyIndex]);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || executing) return;

        const command = input.trim();
        setHistory(prev => [...prev, `root@${container.id.substring(0, 12)}:/# ${command}`]);
        setCommandHistory(prev => [...prev, command]);
        setInput('');
        setHistoryIndex(-1);
        setExecuting(true);

        try {
            const result = await dockerService.execCommand(host.id, container.id, ['sh', '-c', command]);
            const output = result.output || 'Command executed successfully.';
            setHistory(prev => [...prev, output]);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            setHistory(prev => [...prev, `Error: ${errorMessage}`]);
        } finally {
            setExecuting(false);
        }
    };

    useEffect(() => {
        inputRef.current?.focus();
    }, [executing]);

    useEffect(() => {
        if (bodyRef.current) {
            bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
        }
    }, [history]);

    return (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-[#1e1e1e] rounded-lg shadow-2xl w-full max-w-4xl h-full max-h-[80vh] flex flex-col font-mono text-sm"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-3 bg-gray-700 dark:bg-gray-800 rounded-t-lg border-b border-gray-600">
                    <div className="flex items-center space-x-3">
                        <div className="flex space-x-1">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <h2 className="text-sm text-gray-300">Terminal: {container.name}</h2>
                        <span className="text-xs text-gray-500 bg-gray-600 px-2 py-1 rounded">
                            {container.state}
                        </span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
                </header>
                <div ref={bodyRef} className="flex-1 p-4 overflow-y-auto text-white bg-[#1e1e1e]" onClick={() => inputRef.current?.focus()}>
                    {history.map((line, index) => (
                        <div key={index} className="whitespace-pre-wrap mb-1 leading-relaxed">
                            {line}
                        </div>
                    ))}
                    <form onSubmit={handleFormSubmit} className="flex mt-2">
                        <span className="text-green-400 mr-1">root@{container.id.substring(0, 12)}:/#</span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            disabled={executing}
                            className="flex-1 bg-transparent border-none outline-none text-white disabled:opacity-50"
                            placeholder="Type a command..."
                            autoComplete="off"
                            spellCheck="false"
                        />
                        {executing && (
                            <span className="text-yellow-400 ml-2 flex items-center">
                                <div className="animate-spin rounded-full h-3 w-3 border border-yellow-400 border-t-transparent mr-1"></div>
                                Executing...
                            </span>
                        )}
                    </form>
                </div>
                <footer className="p-2 bg-gray-700 dark:bg-gray-800 rounded-b-lg border-t border-gray-600">
                    <div className="text-xs text-gray-400 flex justify-between">
                        <span>Use ↑↓ arrows to navigate command history</span>
                        <span>Container: {container.image}</span>
                    </div>
                </footer>
            </div>
        </div>
    );
};
