import React, { useState, useEffect, useRef } from 'react';
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
    const inputRef = useRef<HTMLInputElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || executing) return;

        const command = input.trim();
        setHistory(prev => [...prev, `root@${container.id.substring(0, 12)}:/# ${command}`]);
        setInput('');
        setExecuting(true);

        try {
            const result = await dockerService.execCommand(host.id, container.id, ['sh', '-c', command]);
            setHistory(prev => [...prev, result.output || 'Command executed successfully.']);
        } catch (error) {
            setHistory(prev => [...prev, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
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
                <header className="flex items-center justify-between p-2 bg-gray-700 dark:bg-gray-800 rounded-t-lg">
                    <h2 className="text-sm text-gray-300">Terminal: {container.name}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </header>
                <div ref={bodyRef} className="flex-1 p-4 overflow-y-auto text-white" onClick={() => inputRef.current?.focus()}>
                    {history.map((line, index) => (
                        <div key={index} className="whitespace-pre-wrap">{line}</div>
                    ))}
                    <form onSubmit={handleFormSubmit} className="flex">
                        <span className="text-green-400">root@{container.id.substring(0, 12)}:/#&nbsp;</span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={handleInputChange}
                            disabled={executing}
                            className="flex-1 bg-transparent border-none outline-none text-white disabled:opacity-50"
                            autoComplete="off"
                        />
                        {executing && <span className="text-yellow-400 ml-2">Executing...</span>}
                    </form>
                </div>
            </div>
        </div>
    );
};
