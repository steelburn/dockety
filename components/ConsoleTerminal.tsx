import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Host, Container } from '../types';
import { dockerService } from '../services/dockerService';

interface ConsoleTerminalProps {
    host: Host;
    container: Container;
    onClose: () => void;
}

export const ConsoleTerminal: React.FC<ConsoleTerminalProps> = ({ host, container, onClose }) => {
    const [history, setHistory] = useState<string[]>([]); // still keep for fallback and messages
    const [input, setInput] = useState('');
    const [executing, setExecuting] = useState(false);
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [currentDirectory, setCurrentDirectory] = useState('/');
    const inputRef = useRef<HTMLInputElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<HTMLDivElement>(null);
    const termInstanceRef = useRef<Terminal | null>(null);
    const fitRef = useRef<FitAddon | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        // Support interactive control sequences when attached
        if (wsRef.current && connected && wsRef.current.readyState === WebSocket.OPEN) {
            if (e.ctrlKey && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                wsRef.current.send('\x03'); // Ctrl+C
                return;
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                wsRef.current.send('\x04'); // Ctrl+D
                return;
            }
        }
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

    const executeCommand = async (commandStr: string) => {
        if (!commandStr || !commandStr.trim()) return;
        const command = commandStr.trim();
        if (executing) return;
        setHistory(prev => [...prev, `root@${container.id.substring(0, 12)}:${currentDirectory}# ${command}`]);
        setCommandHistory(prev => [...prev, command]);
        setInput('');
        setHistoryIndex(-1);
        setExecuting(true);

        try {
            // Handle 'cd' specially
            if (command.startsWith('cd ')) {
                const newDir = command.substring(3).trim();
                if (newDir === '' || newDir === '~') {
                    setCurrentDirectory('/');
                } else if (newDir === '..') {
                    const parts = currentDirectory.split('/').filter(p => p);
                    if (parts.length > 0) {
                        parts.pop();
                        setCurrentDirectory(parts.length === 0 ? '/' : '/' + parts.join('/'));
                    }
                } else if (newDir.startsWith('/')) {
                    setCurrentDirectory(newDir);
                } else {
                    const newPath = currentDirectory === '/' ? `/${newDir}` : `${currentDirectory}/${newDir}`;
                    setCurrentDirectory(newPath);
                }
                setHistory(prev => [...prev, '']);
                return;
            }

            let fullCommand = command;
            if (currentDirectory !== '/') fullCommand = `cd ${currentDirectory} && ${command}`;

            // If we are connected to interactive shell, stream the command
            if (wsRef.current && connected && wsRef.current.readyState === WebSocket.OPEN) {
                try {
                    wsRef.current.send(fullCommand + '\n');
                } catch (err) {
                    // fall back to REST exec
                    const result = await dockerService.execCommand(host.id, container.id, ['sh', '-c', fullCommand]);
                    const output = result.output || 'Command executed successfully.';
                    setHistory(prev => [...prev, output]);
                    termInstanceRef.current?.writeln(output);
                }
            } else {
                const result = await dockerService.execCommand(host.id, container.id, ['sh', '-c', fullCommand]);
                const output = result.output || 'Command executed successfully.';
                setHistory(prev => [...prev, output]);
                termInstanceRef.current?.writeln(output);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            setHistory(prev => [...prev, `Error: ${errorMessage}`]);
        } finally {
            setExecuting(false);
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || executing) return;
        await executeCommand(input.trim());
    };

    useEffect(() => {
        // Initialize xterm
        if (terminalRef.current && !termInstanceRef.current) {
            const term = new Terminal({ cursorBlink: true, scrollback: 1000 });
            const fit = new FitAddon();
            term.loadAddon(fit);
            term.open(terminalRef.current);
            fit.fit();
            term.focus();
            // Refit on window resize
            const onWindowResize = () => {
                try {
                    fit.fit();
                    const cols = term.cols;
                    const rows = term.rows;
                    if (wsRef.current && connected && wsRef.current.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
                    }
                } catch (e) { /* ignore */ }
            };
            window.addEventListener('resize', onWindowResize);
            termInstanceRef.current = term;
            fitRef.current = fit;

            // handle keyboard input and send via websocket if connected
            term.onData((data) => {
                if (wsRef.current && connected && wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(data);
                } else {
                    // fallback: accumulate in input until enter is pressed
                    if (data === '\r' || data === '\n') {
                        // Execute buffered command
                        executeCommand(input);
                    } else if (data === '\x7f') { // backspace
                        setInput(prev => prev.slice(0, -1));
                    } else {
                        setInput(prev => prev + data);
                    }
                }
            });

            // On resize, inform backend
            term.onResize(({ cols, rows }) => {
                if (wsRef.current && connected && wsRef.current.readyState === WebSocket.OPEN) {
                    try {
                        wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
                    } catch (err) { /* ignore */ }
                }
            });
            // cleanup resize event and dispose terminal on unmount
            return () => {
                window.removeEventListener('resize', onWindowResize);
                try { term.dispose(); } catch (e) { /* ignore */ }
                termInstanceRef.current = null;
            };
        }
        inputRef.current?.focus();
    }, [executing]);

    useEffect(() => {
        let mounted = true;
        const attachWs = async () => {
            try {
                const ws = await dockerService.openExecSocket(host.id, container.id);
                    // Focus the input after setting up the terminal
                    inputRef.current?.focus();
                ws.onopen = () => {
                    setConnected(true);
                    const message = `Attached to container ${container.name} (interactive shell)`;
                    setHistory(prev => [...prev, message]);
                    // Send initial resize if terminal is ready
                    const cols = termInstanceRef.current?.cols ?? 80;
                    const rows = termInstanceRef.current?.rows ?? 24;
                    try { ws.send(JSON.stringify({ type: 'resize', cols, rows })); } catch (e) { }
                };
                ws.onmessage = (msg) => {
                    const text = typeof msg.data === 'string' ? msg.data : new TextDecoder().decode(msg.data as ArrayBuffer);
                    if (termInstanceRef.current) {
                        termInstanceRef.current.write(text);
                    } else {
                        setHistory(prev => [...prev, text]);
                    }
                };
                ws.onclose = () => {
                    setConnected(false);
                    setHistory(prev => [...prev, `Disconnected from container ${container.name}`]);
                };
                ws.onerror = (err: any) => {
                    setHistory(prev => [...prev, `WebSocket error: ${String(err)}`]);
                };
            } catch (err: any) {
                setHistory(prev => [...prev, `Failed to attach to interactive shell: ${err.message || String(err)}`]);
            }
        };
        attachWs();
        return () => { mounted = false; try { wsRef.current?.close(); } catch (e) { } };
    }, [host.id, container.id]);

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
                        <span className={`text-xs px-2 py-0.5 rounded ${connected ? 'bg-green-600' : 'bg-gray-600'} text-white`}>{connected ? 'connected' : 'disconnected'}</span>
                        <span className="text-xs text-gray-500 bg-gray-600 px-2 py-1 rounded">
                            {container.state}
                        </span>
                    </div>
                    <button onClick={() => { try { wsRef.current?.close(); } catch (e) {}; onClose(); }} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
                </header>
                <div className="flex-1 p-0 overflow-hidden bg-[#1e1e1e]" onClick={() => inputRef.current?.focus()}>
                    <div ref={terminalRef} className="h-full min-h-[300px] w-full" />
                    {/* Fallback input for non-interactive mode */}
                    <div className="p-2 bg-gray-900 border-t border-gray-700">
                        <form onSubmit={handleFormSubmit} className="flex">
                            <span className="text-green-400 mr-1">root@{container.id.substring(0, 12)}:{currentDirectory}#</span>
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                disabled={executing}
                                className="flex-1 bg-transparent border-none outline-none text-white disabled:opacity-50"
                                placeholder="Type a command (fallback)..."
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
