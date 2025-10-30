import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    ReactFlow,
    Node,
    Edge,
    addEdge,
    Connection,
    useNodesState,
    useEdgesState,
    Controls,
    MiniMap,
    Background,
    BackgroundVariant,
    Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Host, Container, Network, Volume, Image, ComposeProject } from '../types';
import { dockerService } from '../services/dockerService';

interface NetworkMapViewProps {
    host: Host;
}

interface ResourceNode extends Node {
    data: {
        name: string;
        status?: string;
        resourceType: 'container' | 'network' | 'volume' | 'image' | 'compose';
        resourceData?: any;
    };
}

const NetworkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" /></svg>;
const ContainerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12H16l-3 3H6l-3-3H2" /><path d="M22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6" /><path d="M22 12V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v6" /><path d="M8 6v2" /><path d="M16 6v2" /><path d="M12 6v2" /></svg>;
const VolumeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V4" /><path d="M4 4h16" /><path d="M9 8h6" /><path d="M9 12h6" /><path d="M9 16h6" /></svg>;
const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>;
const ComposeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14,2 14,8 20,8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></svg>;

// Custom node component
const ResourceNodeComponent: React.FC<{ data: ResourceNode['data'] }> = ({ data }) => {
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

    return (
        <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-white shadow-lg min-w-max ${getNodeColor(data.resourceType, data.status)}`}>
            {getNodeIcon(data.resourceType)}
            <div className="text-sm font-medium truncate max-w-32" title={data.name}>
                {data.name}
            </div>
            {data.resourceType === 'container' && data.status && (
                <div className={`w-2 h-2 rounded-full ${data.status === 'running' ? 'bg-green-200' :
                        data.status === 'exited' ? 'bg-red-200' :
                            data.status === 'paused' ? 'bg-yellow-200' : 'bg-gray-200'
                    }`} />
            )}
        </div>
    );
};

const nodeTypes = {
    resourceNode: ResourceNodeComponent,
};

export const NetworkMapView: React.FC<NetworkMapViewProps> = ({ host }) => {
    const [containers, setContainers] = useState<Container[]>([]);
    const [networks, setNetworks] = useState<Network[]>([]);
    const [volumes, setVolumes] = useState<Volume[]>([]);
    const [images, setImages] = useState<Image[]>([]);
    const [composeProjects, setComposeProjects] = useState<ComposeProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<ResourceNode | null>(null);

    const [nodes, setNodes, onNodesChange] = useNodesState<ResourceNode>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

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

    // Generate React Flow nodes and edges with improved layout
    const { flowNodes, flowEdges } = useMemo(() => {
        const nodes: ResourceNode[] = [];
        const edges: Edge[] = [];
        const connectedNodeIds = new Set<string>();

        // Layout constants
        const COLUMN_SPACING = 300;
        const ROW_SPACING = 120;
        const ORPHANED_X_OFFSET = 800; // Place orphaned resources on the right side

        // Track positions for each type
        let composeY = 50;
        let networkY = 200;
        let containerY = 350;
        let volumeY = 350;
        let imageY = 500;
        let orphanedY = 50;

        // Add compose projects first (left side, top)
        composeProjects.forEach((project, index) => {
            const nodeId = `compose-${project.name}`;
            nodes.push({
                id: nodeId,
                type: 'resourceNode',
                position: { x: 50, y: composeY },
                data: {
                    name: project.name,
                    resourceType: 'compose',
                    resourceData: { type: 'compose', ...project }
                },
                draggable: true,
            });
            composeY += ROW_SPACING;

            // Mark connected containers
            project.containers.forEach(c => connectedNodeIds.add(`container-${c.id}`));
        });

        // Add networks (left side, middle)
        networks.forEach((network, index) => {
            const nodeId = `network-${network.id}`;
            nodes.push({
                id: nodeId,
                type: 'resourceNode',
                position: { x: 50 + COLUMN_SPACING, y: networkY },
                data: {
                    name: network.name,
                    resourceType: 'network',
                    resourceData: { type: 'network', ...network }
                },
                draggable: true,
            });
            networkY += ROW_SPACING;

            // Mark connected containers and compose projects
            network.containers.forEach(c => connectedNodeIds.add(`container-${c}`));
            network.composeProjects.forEach(p => connectedNodeIds.add(`compose-${p}`));
        });

        // Add containers (left side, bottom)
        containers.forEach((container, index) => {
            const nodeId = `container-${container.id}`;
            const isOrphaned = !connectedNodeIds.has(nodeId);
            const x = isOrphaned ? ORPHANED_X_OFFSET : 50 + (COLUMN_SPACING * 2);
            const y = isOrphaned ? orphanedY : containerY + (index % 4) * ROW_SPACING;

            nodes.push({
                id: nodeId,
                type: 'resourceNode',
                position: { x, y },
                data: {
                    name: container.name,
                    status: container.state,
                    resourceType: 'container',
                    resourceData: { type: 'container', ...container }
                },
                draggable: true,
            });

            if (!isOrphaned) {
                containerY += ROW_SPACING;
            } else {
                orphanedY += ROW_SPACING;
            }

            // Connect container to its network
            if (container.network) {
                edges.push({
                    id: `edge-${container.id}-network`,
                    source: nodeId,
                    target: `network-${container.network}`,
                    type: 'smoothstep',
                    style: { stroke: '#10b981', strokeWidth: 2 },
                });
            }

            // Connect container to its compose project
            if (container.composeProject) {
                edges.push({
                    id: `edge-${container.id}-compose`,
                    source: `compose-${container.composeProject}`,
                    target: nodeId,
                    type: 'smoothstep',
                    style: { stroke: '#8b5cf6', strokeWidth: 2 },
                });
            }
        });

        // Add volumes (middle-right, connected to containers)
        volumes.forEach((volume, index) => {
            const nodeId = `volume-${volume.name}`;
            const isOrphaned = volume.containers.length === 0;
            const x = isOrphaned ? ORPHANED_X_OFFSET + COLUMN_SPACING : 50 + (COLUMN_SPACING * 3);
            const y = isOrphaned ? orphanedY : volumeY + (index % 3) * ROW_SPACING;

            nodes.push({
                id: nodeId,
                type: 'resourceNode',
                position: { x, y },
                data: {
                    name: volume.name,
                    resourceType: 'volume',
                    resourceData: { type: 'volume', ...volume }
                },
                draggable: true,
            });

            if (!isOrphaned) {
                volumeY += ROW_SPACING;
            } else {
                orphanedY += ROW_SPACING;
            }

            // Connect volumes to containers
            volume.containers.forEach(containerName => {
                const container = containers.find(c => c.name === containerName);
                if (container) {
                    edges.push({
                        id: `edge-${volume.name}-${container.id}`,
                        source: `container-${container.id}`,
                        target: nodeId,
                        type: 'smoothstep',
                        style: { stroke: '#f59e0b', strokeWidth: 2 },
                    });
                }
            });
        });

        // Add images (bottom, orphaned section)
        images.slice(0, 15).forEach((image, index) => { // Limit for performance
            const nodeId = `image-${image.id}`;
            const x = ORPHANED_X_OFFSET + (COLUMN_SPACING * 2) + (index % 3) * 200;
            const y = imageY + Math.floor(index / 3) * ROW_SPACING;

            nodes.push({
                id: nodeId,
                type: 'resourceNode',
                position: { x, y },
                data: {
                    name: image.tags.length > 0 ? image.tags[0] : image.id.substring(7, 19),
                    resourceType: 'image',
                    resourceData: { type: 'image', ...image }
                },
                draggable: true,
            });
        });

        // Connect networks to compose projects
        networks.forEach(network => {
            network.composeProjects.forEach(projectName => {
                edges.push({
                    id: `edge-network-${network.id}-compose-${projectName}`,
                    source: `compose-${projectName}`,
                    target: `network-${network.id}`,
                    type: 'smoothstep',
                    style: { stroke: '#3b82f6', strokeWidth: 2 },
                });
            });
        });

        return { flowNodes: nodes, flowEdges: edges };
    }, [containers, networks, volumes, images, composeProjects]);

    useEffect(() => {
        setNodes(flowNodes);
        setEdges(flowEdges);
    }, [flowNodes, flowEdges, setNodes, setEdges]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        setSelectedNode(node as ResourceNode);
    }, []);

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
        <div className="p-4 md:p-6 space-y-4 h-full">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Infrastructure Map</h1>
                <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        {nodes.length} resources • {edges.length} connections
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
                    <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-gray-400 rounded border-2 border-dashed border-gray-600"></div>
                        <span>Orphaned Resources (Right Side)</span>
                    </div>
                </div>
            </div>

            {/* React Flow Visualization */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden" style={{ height: '600px' }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={onNodeClick}
                    nodeTypes={nodeTypes}
                    fitView
                    attributionPosition="bottom-left"
                >
                    <Controls />
                    <MiniMap
                        nodeColor={(node) => {
                            switch (node.data?.resourceType) {
                                case 'compose': return '#8b5cf6';
                                case 'network': return '#3b82f6';
                                case 'container': return node.data?.status === 'running' ? '#10b981' : '#ef4444';
                                case 'volume': return '#f59e0b';
                                case 'image': return '#6366f1';
                                default: return '#6b7280';
                            }
                        }}
                        nodeStrokeWidth={3}
                        zoomable
                        pannable
                    />
                    <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                    <Panel position="top-right">
                        <div className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-2 rounded shadow">
                            Drag nodes to reposition • Zoom with mouse wheel
                        </div>
                    </Panel>
                </ReactFlow>
            </div>

            {/* Selected Node Details */}
            {selectedNode && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {selectedNode.data.resourceType?.charAt(0).toUpperCase() + selectedNode.data.resourceType?.slice(1)} Details
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
                                <div><span className="font-medium">Name:</span> {selectedNode.data.name}</div>
                                <div><span className="font-medium">Type:</span> {selectedNode.data.resourceType}</div>
                                {selectedNode.data.status && <div><span className="font-medium">Status:</span> {selectedNode.data.status}</div>}
                                <div><span className="font-medium">ID:</span> <code className="text-xs bg-gray-200 dark:bg-gray-600 px-1 py-0.5 rounded">{selectedNode.id}</code></div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Connections</h4>
                            <div className="text-sm">
                                <div><span className="font-medium">Connected to:</span> {edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length} resources</div>
                                {edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length > 0 && (
                                    <ul className="mt-1 space-y-1">
                                        {edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).slice(0, 5).map((edge) => {
                                            const connectedNodeId = edge.source === selectedNode.id ? edge.target : edge.source;
                                            const connectedNode = nodes.find(n => n.id === connectedNodeId);
                                            return connectedNode ? (
                                                <li key={edge.id} className="text-xs text-gray-600 dark:text-gray-400">
                                                    {connectedNode.data.resourceType}: {connectedNode.data.name}
                                                </li>
                                            ) : null;
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Additional details based on type */}
                    {selectedNode.data.resourceType === 'container' && selectedNode.data.resourceData && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Container Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div><span className="font-medium">Image:</span> {selectedNode.data.resourceData.image}</div>
                                <div><span className="font-medium">Ports:</span> {selectedNode.data.resourceData.ports?.length > 0 ? selectedNode.data.resourceData.ports.map((p: any) => `${p.privatePort}${p.publicPort ? `->${p.publicPort}` : ''}`).join(', ') : 'None'}</div>
                                <div><span className="font-medium">Created:</span> {selectedNode.data.resourceData.created ? new Date(selectedNode.data.resourceData.created).toLocaleString() : 'Unknown'}</div>
                            </div>
                        </div>
                    )}

                    {selectedNode.data.resourceType === 'network' && selectedNode.data.resourceData && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Network Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div><span className="font-medium">Driver:</span> {selectedNode.data.resourceData.driver}</div>
                                <div><span className="font-medium">Scope:</span> {selectedNode.data.resourceData.scope}</div>
                                <div><span className="font-medium">Containers:</span> {selectedNode.data.resourceData.containers?.length || 0}</div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};