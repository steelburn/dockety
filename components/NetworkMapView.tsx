import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Host, Container, Network, Volume, Image, ComposeProject } from '../types';
import { dockerService } from '../services/dockerService';

interface NetworkMapViewProps {
    host: Host;
}

interface ResourceNode {
    id: string;
    type: 'container' | 'network' | 'volume' | 'image' | 'compose';
    name: string;
    status?: string;
    position: { x: number; y: number };
    connections: string[];
    data?: any;
}

const NetworkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" /></svg>;
const ContainerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12H16l-3 3H6l-3-3H2" /><path d="M22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6" /><path d="M22 12V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v6" /><path d="M8 6v2" /><path d="M16 6v2" /><path d="M12 6v2" /></svg>;
const VolumeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V4" /><path d="M4 4h16" /><path d="M9 8h6" /><path d="M9 12h6" /><path d="M9 16h6" /></svg>;
const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>;
const ComposeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14,2 14,8 20,8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></svg>;

export const NetworkMapView: React.FC<NetworkMapViewProps> = ({ host }) => {
    const [containers, setContainers] = useState<Container[]>([]);
    const [networks, setNetworks] = useState<Network[]>([]);
    const [volumes, setVolumes] = useState<Volume[]>([]);
    const [images, setImages] = useState<Image[]>([]);
    const [composeProjects, setComposeProjects] = useState<ComposeProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<ResourceNode | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [containersData, networksData, volumesData, imagesData, composeData] = await Promise.all([
                dockerService.getContainers(host.id),
                dockerService.getNetworks(host.id),
                dockerService.getVolumes(host.id),
                dockerService.getImages(host.id),
                dockerService.getComposeProjects(host.id)
            ]);

            setContainers(containersData);
            setNetworks(networksData);
            setVolumes(volumesData);
            setImages(imagesData);
            setComposeProjects(composeData);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch infrastructure data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [host]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Generate the network map nodes and connections
    const networkMapData = useMemo(() => {
        const nodes: ResourceNode[] = [];
        const connections: Array<{ from: string; to: string; type: string }> = [];

        // Add compose projects first (top level)
        composeProjects.forEach((project, index) => {
            nodes.push({
                id: `compose-${project.name}`,
                type: 'compose',
                name: project.name,
                position: { x: index * 300 + 50, y: 50 },
                connections: project.containers.map(c => `container-${c.id}`),
                data: project
            });
        });

        // Add networks (middle level)
        networks.forEach((network, index) => {
            const y = composeProjects.length > 0 ? 200 : 100;
            nodes.push({
                id: `network-${network.id}`,
                type: 'network',
                name: network.name,
                position: { x: index * 250 + 50, y },
                connections: [
                    ...network.containers.map(c => `container-${c}`),
                    ...network.composeProjects.map(p => `compose-${p}`)
                ],
                data: network
            });

            // Connect networks to compose projects
            network.composeProjects.forEach(projectName => {
                connections.push({
                    from: `compose-${projectName}`,
                    to: `network-${network.id}`,
                    type: 'compose-network'
                });
            });
        });

        // Add containers (connected to networks)
        containers.forEach((container, index) => {
            const networkY = networks.length > 0 ? (composeProjects.length > 0 ? 200 : 100) : 100;
            const y = networkY + 150 + (index % 3) * 120;
            const x = (index % 4) * 200 + 50;

            nodes.push({
                id: `container-${container.id}`,
                type: 'container',
                name: container.name,
                status: container.state,
                position: { x, y },
                connections: [`network-${container.network}`],
                data: container
            });

            // Connect container to its network
            connections.push({
                from: `container-${container.id}`,
                to: `network-${container.network}`,
                type: 'container-network'
            });

            // Connect container to its compose project if it exists
            if (container.composeProject) {
                connections.push({
                    from: `compose-${container.composeProject}`,
                    to: `container-${container.id}`,
                    type: 'compose-container'
                });
            }
        });

        // Add volumes (connected to containers that use them)
        volumes.forEach((volume, index) => {
            const containerY = networks.length > 0 ? (composeProjects.length > 0 ? 350 : 250) : 250;
            const y = containerY + (index % 2) * 100;
            const x = 600 + (index % 3) * 150;

            nodes.push({
                id: `volume-${volume.name}`,
                type: 'volume',
                name: volume.name,
                position: { x, y },
                connections: volume.containers.map(c => `container-${c}`),
                data: volume
            });

            // Connect volumes to containers
            volume.containers.forEach(containerName => {
                const container = containers.find(c => c.name === containerName);
                if (container) {
                    connections.push({
                        from: `container-${container.id}`,
                        to: `volume-${volume.name}`,
                        type: 'container-volume'
                    });
                }
            });
        });

        // Add images (bottom level, sources for containers)
        images.slice(0, 10).forEach((image, index) => { // Limit to first 10 images for performance
            const y = 500 + Math.floor(index / 5) * 80;
            const x = (index % 5) * 150 + 50;

            nodes.push({
                id: `image-${image.id}`,
                type: 'image',
                name: image.tags.length > 0 ? image.tags[0] : image.id.substring(7, 19),
                position: { x, y },
                connections: [], // Images don't connect to anything in this view
                data: image
            });
        });

        return { nodes, connections };
    }, [containers, networks, volumes, images, composeProjects]);

    const getNodeColor = (type: string, status?: string) => {
        switch (type) {
            case 'compose': return 'bg-purple-500';
            case 'network': return 'bg-blue-500';
            case 'container':
                switch (status) {
                    case 'running': return 'bg-green-500';
                    case 'exited': return 'bg-red-500';
                    case 'paused': return 'bg-yellow-500';
                    default: return 'bg-gray-500';
                }
            case 'volume': return 'bg-orange-500';
            case 'image': return 'bg-indigo-500';
            default: return 'bg-gray-500';
        }
    };

    const getNodeIcon = (type: string) => {
        switch (type) {
            case 'compose': return <ComposeIcon />;
            case 'network': return <NetworkIcon />;
            case 'container': return <ContainerIcon />;
            case 'volume': return <VolumeIcon />;
            case 'image': return <ImageIcon />;
            default: return null;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-500 text-center p-6">
                <div className="text-lg font-semibold mb-2">Failed to load network map</div>
                <div>{error}</div>
                <button
                    onClick={fetchData}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Infrastructure Map</h1>
                <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        {networkMapData.nodes.length} resources • {networkMapData.connections.length} connections
                    </div>
                    <button
                        onClick={fetchData}
                        className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Legend</h3>
                <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-purple-500 rounded"></div>
                        <span>Compose Project</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-blue-500 rounded"></div>
                        <span>Network</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <span>Running Container</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-red-500 rounded"></div>
                        <span>Stopped Container</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-orange-500 rounded"></div>
                        <span>Volume</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-indigo-500 rounded"></div>
                        <span>Image</span>
                    </div>
                </div>
            </div>

            {/* Network Map Visualization */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div className="relative" style={{ height: '600px', overflow: 'auto' }}>
                    <svg
                        className="absolute inset-0 w-full h-full"
                        style={{ minWidth: '800px', minHeight: '600px' }}
                    >
                        {/* Connection lines */}
                        {networkMapData.connections.map((connection, index) => {
                            const fromNode = networkMapData.nodes.find(n => n.id === connection.from);
                            const toNode = networkMapData.nodes.find(n => n.id === connection.to);

                            if (!fromNode || !toNode) return null;

                            const strokeColor = connection.type === 'compose-container' ? '#8b5cf6' :
                                connection.type === 'compose-network' ? '#3b82f6' :
                                    connection.type === 'container-network' ? '#10b981' :
                                        connection.type === 'container-volume' ? '#f59e0b' : '#6b7280';

                            return (
                                <line
                                    key={index}
                                    x1={fromNode.position.x + 32}
                                    y1={fromNode.position.y + 32}
                                    x2={toNode.position.x + 32}
                                    y2={toNode.position.y + 32}
                                    stroke={strokeColor}
                                    strokeWidth="2"
                                    opacity="0.6"
                                />
                            );
                        })}
                    </svg>

                    {/* Resource nodes */}
                    {networkMapData.nodes.map((node) => (
                        <div
                            key={node.id}
                            className={`absolute cursor-pointer transform transition-transform hover:scale-105 ${selectedNode?.id === node.id ? 'ring-4 ring-blue-400' : ''
                                }`}
                            style={{
                                left: node.position.x,
                                top: node.position.y,
                                zIndex: selectedNode?.id === node.id ? 10 : 1
                            }}
                            onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
                        >
                            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-white shadow-lg ${getNodeColor(node.type, node.status)}`}>
                                {getNodeIcon(node.type)}
                                <div className="text-sm font-medium truncate max-w-32" title={node.name}>
                                    {node.name}
                                </div>
                                {node.type === 'container' && node.status && (
                                    <div className={`w-2 h-2 rounded-full ${node.status === 'running' ? 'bg-green-200' :
                                            node.status === 'exited' ? 'bg-red-200' :
                                                node.status === 'paused' ? 'bg-yellow-200' : 'bg-gray-200'
                                        }`} />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Selected Node Details */}
            {selectedNode && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1)} Details
                        </h3>
                        <button
                            onClick={() => setSelectedNode(null)}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Basic Information</h4>
                            <div className="space-y-1 text-sm">
                                <div><span className="font-medium">Name:</span> {selectedNode.name}</div>
                                <div><span className="font-medium">Type:</span> {selectedNode.type}</div>
                                {selectedNode.status && <div><span className="font-medium">Status:</span> {selectedNode.status}</div>}
                                <div><span className="font-medium">ID:</span> <code className="text-xs bg-gray-200 dark:bg-gray-600 px-1 py-0.5 rounded">{selectedNode.id}</code></div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Connections</h4>
                            <div className="text-sm">
                                <div><span className="font-medium">Connected to:</span> {selectedNode.connections.length} resources</div>
                                {selectedNode.connections.length > 0 && (
                                    <ul className="mt-1 space-y-1">
                                        {selectedNode.connections.slice(0, 5).map((connId) => {
                                            const connectedNode = networkMapData.nodes.find(n => n.id === connId);
                                            return connectedNode ? (
                                                <li key={connId} className="text-xs text-gray-600 dark:text-gray-400">
                                                    {connectedNode.type}: {connectedNode.name}
                                                </li>
                                            ) : null;
                                        })}
                                        {selectedNode.connections.length > 5 && (
                                            <li className="text-xs text-gray-500">... and {selectedNode.connections.length - 5} more</li>
                                        )}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Additional details based on type */}
                    {selectedNode.type === 'container' && selectedNode.data && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Container Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div><span className="font-medium">Image:</span> {selectedNode.data.image}</div>
                                <div><span className="font-medium">Ports:</span> {selectedNode.data.ports.length > 0 ? selectedNode.data.ports.map(p => `${p.privatePort}${p.publicPort ? `->${p.publicPort}` : ''}`).join(', ') : 'None'}</div>
                                <div><span className="font-medium">Created:</span> {new Date(selectedNode.data.created).toLocaleString()}</div>
                            </div>
                        </div>
                    )}

                    {selectedNode.type === 'network' && selectedNode.data && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Network Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div><span className="font-medium">Driver:</span> {selectedNode.data.driver}</div>
                                <div><span className="font-medium">Scope:</span> {selectedNode.data.scope}</div>
                                <div><span className="font-medium">Containers:</span> {selectedNode.data.containers.length}</div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};