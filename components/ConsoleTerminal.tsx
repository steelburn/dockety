import React, { useState, useEffect, useRef } from 'react';
import { Host, Container } from '../types';

interface ConsoleTerminalProps {
    host: Host;
    container: Container;
    onClose: () => void;
}

export const ConsoleTerminal: React.FC<ConsoleTerminalProps> = ({ container, onClose }) => {
    const [history, setHistory] = useState<string[]>(['Welcome to the mock terminal!', `Connected to ${container.name}. Type 'help' for mock commands.`]);
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!input) return;

        let newHistory = [...history, `root@${container.id.substring(0,12)}:/# ${input}`];
        
        switch(input.toLowerCase()) {
            case 'help':
                newHistory.push('Mock Commands: ls, pwd, whoami, exit');
                break;
            case 'ls':
                newHistory.push('bin   dev  home  lib64  mnt  proc  run   srv  tmp  var');
                newHistory.push('boot  etc  lib   media  opt  root  sbin  sys  usr');
                break;
            case 'pwd':
                newHistory.push('/');
                break;
            case 'whoami':
                newHistory.push('root');
                break;
            case 'exit':
                onClose();
                return;
            default:
                 newHistory.push(`-bash: command not found: ${input}`);
        }
        
        setHistory(newHistory);
        setInput('');
    };

    useEffect(() => {
        inputRef.current?.focus();
    }, []);
    
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
                        <div key={index}>{line}</div>
                    ))}
                    <form onSubmit={handleFormSubmit} className="flex">
                       <span className="text-green-400">root@{container.id.substring(0,12)}:/#&nbsp;</span>
                       <input
                           ref={inputRef}
                           type="text"
                           value={input}
                           onChange={handleInputChange}
                           className="flex-1 bg-transparent border-none outline-none text-white"
                           autoComplete="off"
                       />
                    </form>
                </div>
            </div>
        </div>
    );
};
