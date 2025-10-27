import React, { useState } from 'react';

interface CreateNetworkModalProps {
    onClose: () => void;
    onCreate: (name: string, driver: string, options: NetworkOptions) => void;
}

interface NetworkOptions {
    subnet?: string;
    gateway?: string;
    ipRange?: string;
    labels?: Record<string, string>;
}

export const CreateNetworkModal: React.FC<CreateNetworkModalProps> = ({ onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [driver, setDriver] = useState('bridge');
    const [subnet, setSubnet] = useState('');
    const [gateway, setGateway] = useState('');
    const [ipRange, setIpRange] = useState('');
    const [labels, setLabels] = useState<Record<string, string>>({});
    const [newLabelKey, setNewLabelKey] = useState('');
    const [newLabelValue, setNewLabelValue] = useState('');
    const [error, setError] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Network name cannot be empty.');
            return;
        }
        setError('');

        const options: NetworkOptions = {};
        if (subnet.trim()) options.subnet = subnet.trim();
        if (gateway.trim()) options.gateway = gateway.trim();
        if (ipRange.trim()) options.ipRange = ipRange.trim();
        if (Object.keys(labels).length > 0) options.labels = labels;

        onCreate(name, driver, options);
    };

    const addLabel = () => {
        if (newLabelKey.trim() && newLabelValue.trim()) {
            setLabels(prev => ({ ...prev, [newLabelKey.trim()]: newLabelValue.trim() }));
            setNewLabelKey('');
            setNewLabelValue('');
        }
    };

    const removeLabel = (key: string) => {
        setLabels(prev => {
            const newLabels = { ...prev };
            delete newLabels[key];
            return newLabels;
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <form onSubmit={handleSubmit}>
                    <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Network</h2>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-800 dark:hover:text-white text-2xl leading-none">&times;</button>
                    </header>
                    <main className="p-6 space-y-4">
                        <div>
                            <label htmlFor="network-name" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Network Name *</label>
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
                                <option value="none">none</option>
                            </select>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                                <span>{showAdvanced ? '▼' : '▶'} Advanced Options</span>
                            </button>

                            {showAdvanced && (
                                <div className="mt-4 space-y-4">
                                    <div>
                                        <label htmlFor="subnet" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Subnet (e.g., 192.168.1.0/24)</label>
                                        <input
                                            type="text"
                                            id="subnet"
                                            value={subnet}
                                            onChange={(e) => setSubnet(e.target.value)}
                                            placeholder="192.168.1.0/24"
                                            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="gateway" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Gateway (e.g., 192.168.1.1)</label>
                                        <input
                                            type="text"
                                            id="gateway"
                                            value={gateway}
                                            onChange={(e) => setGateway(e.target.value)}
                                            placeholder="192.168.1.1"
                                            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="ip-range" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">IP Range (e.g., 192.168.1.0/25)</label>
                                        <input
                                            type="text"
                                            id="ip-range"
                                            value={ipRange}
                                            onChange={(e) => setIpRange(e.target.value)}
                                            placeholder="192.168.1.0/25"
                                            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Labels</label>
                                        <div className="space-y-2">
                                            {Object.entries(labels).map(([key, value]) => (
                                                <div key={key} className="flex items-center space-x-2">
                                                    <span className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-700/50 rounded text-sm">{key}={value}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeLabel(key)}
                                                        className="text-red-500 hover:text-red-700 text-sm"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                            <div className="flex space-x-2">
                                                <input
                                                    type="text"
                                                    value={newLabelKey}
                                                    onChange={(e) => setNewLabelKey(e.target.value)}
                                                    placeholder="Key"
                                                    className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded"
                                                />
                                                <input
                                                    type="text"
                                                    value={newLabelValue}
                                                    onChange={(e) => setNewLabelValue(e.target.value)}
                                                    placeholder="Value"
                                                    className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={addLabel}
                                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
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
