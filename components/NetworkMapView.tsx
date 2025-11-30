import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
    /**
     * Network Map Filters
     * - Resource Types: Toggle which resource types to show (containers, networks, volumes, images, compose)
     * - Search: Text search for resource names
     * - Only running: Show only containers that are currently running
     * - Show orphaned: Toggle display of orphaned resources placed on the right side
     * Filters are persisted to localStorage under 'networkMapFilters'
     */
    const [containers, setContainers] = useState<Container[]>([]);
    const [networks, setNetworks] = useState<Network[]>([]);
    const [volumes, setVolumes] = useState<Volume[]>([]);
    const [images, setImages] = useState<Image[]>([]);
    const [composeProjects, setComposeProjects] = useState<ComposeProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<ResourceNode | null>(null);
    // Filters for map (resource types, search, state)
    const [filters, setFilters] = useState(() => {
        try {
            const raw = localStorage.getItem('networkMapFilters');
            if (raw) return JSON.parse(raw);
        } catch (e) {
            // ignore
        }
        return { resourceTypes: { container: true, network: true, volume: true, image: true, compose: true }, search: '', runningOnly: false, showOrphaned: true };
    });
    const [filterOpen, setFilterOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement | null>(null);

    // Keyboard shortcut: Shift+F toggles filter panel and focuses search input
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing into inputs
            const target = e.target as HTMLElement | null;
            if (target) {
                const tag = target.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;
            }

            if (e.key === 'Escape') {
                setFilterOpen(false);
                return;
            }
            if (e.key.toLowerCase() === 'f' && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
                e.preventDefault();
                setFilterOpen(prev => {
                    const next = !prev;
                    if (next) {
                        // Focus after next tick so element exists
                        setTimeout(() => searchInputRef.current?.focus(), 50);
                    }
                    return next;
                });
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    // Persist filters to localStorage
    useEffect(() => {
        try { localStorage.setItem('networkMapFilters', JSON.stringify(filters)); } catch (e) { /* noop */ }
    }, [filters]);

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
            // Note: network.containers contains container names, not IDs. Look up the container by name or id.
            network.containers.forEach(containerRef => {
                const foundContainer = containers.find(ct => ct.name === containerRef || ct.id === containerRef);
                if (foundContainer) {
                    connectedNodeIds.add(`container-${foundContainer.id}`);
                    // create an edge between the network and container (covers multi-network setups)
                    const id_ = `edge-${foundContainer.id}-network-${network.id}`;
                    if (!edges.find(e => e.id === id_)) {
                        edges.push({
                        id: `edge-${foundContainer.id}-network-${network.id}`,
                        source: `container-${foundContainer.id}`,
                        target: `network-${network.id}`,
                        type: 'smoothstep',
                        style: { stroke: '#3b82f6', strokeWidth: 2 },
                        animated: true,
                        label: 'network',
                        // Add arrowhead when supported by the flow component
                        arrowHeadType: 'arrowclosed' as any,
                    });
                    }
                }
            });
            network.composeProjects.forEach(p => connectedNodeIds.add(`compose-${p}`));
        });

        // Add containers (left side, bottom)
        containers.forEach((container, index) => {
            const nodeId = `container-${container.id}`;
            // Try to find the network object by id or name. Sometimes the backend stores a name.
            const containerNetworkObj = networks.find(n => n.id === container.network || n.name === container.network);
            const hasCompose = !!container.composeProject;
            const hasNetwork = !!containerNetworkObj;
            const hasVolumes = (container.volumes || []).length > 0;
            const isOrphaned = !connectedNodeIds.has(nodeId) && !hasCompose && !hasNetwork && !hasVolumes;
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
                    resourceData: { type: 'container', ...container, isOrphaned }
                },
                draggable: true,
            });

            if (!isOrphaned) {
                containerY += ROW_SPACING;
            } else {
                orphanedY += ROW_SPACING;
            }

            // Connect container to its network
            if (containerNetworkObj) {
                const edgeId = `edge-${container.id}-network-${containerNetworkObj.id}`;
                if (!edges.find(e => e.id === edgeId)) {
                    edges.push({
                        id: edgeId,
                        source: nodeId,
                        target: `network-${containerNetworkObj.id}`,
                        type: 'smoothstep',
                        style: { stroke: '#10b981', strokeWidth: 2 },
                        animated: true,
                        label: 'network',
                        arrowHeadType: 'arrowclosed' as any,
                    });
                }
                // Mark as connected
                connectedNodeIds.add(nodeId);
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
                    resourceData: { type: 'volume', ...volume, isOrphaned }
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
                    const volEdgeId = `edge-${volume.name}-${container.id}`;
                    if (!edges.find(e => e.id === volEdgeId)) {
                        edges.push({
                            id: volEdgeId,
                            source: `container-${container.id}`,
                            target: nodeId,
                            type: 'smoothstep',
                            style: { stroke: '#f59e0b', strokeWidth: 2 },
                            animated: true,
                            label: 'volume',
                            arrowHeadType: 'arrowclosed' as any,
                        });
                    }
                }
            });
        });

        // Add images (bottom, orphaned section) and connect them to containers that use the image
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
                    resourceData: { type: 'image', ...image, isOrphaned: true }
                },
                draggable: true,
            });
            // Link containers that use this image to this image node
            // Prefer explicit container lists from the Image object when available
            (image.containers || []).forEach(containerRef => {
                const foundContainer = containers.find(ct => ct.name === containerRef || ct.id === containerRef);
                if (foundContainer) {
                    const imgEdgeId = `edge-container-${foundContainer.id}-image-${image.id}`;
                    if (!edges.find(e => e.id === imgEdgeId)) {
                        edges.push({
                            id: imgEdgeId,
                            source: `container-${foundContainer.id}`,
                            target: nodeId,
                            type: 'smoothstep',
                            style: { stroke: '#6366f1', strokeWidth: 2 },
                            animated: true,
                            label: 'image',
                            arrowHeadType: 'arrowclosed' as any,
                        });
                    }
                }
            });
            // Fallback: match by container.image string to tag or image id
            containers.forEach(container => {
                const containerImage = container.image || '';
                const matchesTag = image.tags && image.tags.some(tag => tag === containerImage || containerImage.includes(tag));
                const matchesId = image.id && (image.id === containerImage || image.id.startsWith(containerImage));
                if ((matchesTag || matchesId) && !edges.find(e => e.id === `edge-container-${container.id}-image-${image.id}`)) {
                    const imgEdgeId = `edge-container-${container.id}-image-${image.id}`;
                    if (!edges.find(e => e.id === imgEdgeId)) {
                        edges.push({
                            id: imgEdgeId,
                            source: `container-${container.id}`,
                            target: nodeId,
                            type: 'smoothstep',
                            style: { stroke: '#6366f1', strokeWidth: 2 },
                            animated: true,
                            label: 'image',
                            arrowHeadType: 'arrowclosed' as any,
                        });
                    }
                }
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

        // Apply filters to nodes and edges
        const filteredNodes = nodes.filter(n => {
            const type = n.data.resourceType as keyof typeof filters.resourceTypes;
            if (!filters.resourceTypes[type]) return false;
            if (filters.search && !n.data.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
            if (filters.runningOnly && n.data.resourceType === 'container' && n.data.status !== 'running') return false;
            if (!filters.showOrphaned && (n.data.resourceData?.isOrphaned)) return false;
            return true;
        });

        const allowedIds = new Set(filteredNodes.map(n => n.id));

        const filteredEdges = edges.filter(e => allowedIds.has(String(e.source)) && allowedIds.has(String(e.target)));

        if (import.meta.env.DEV) {
            try {
                console.debug(`NetworkMap: generated nodes=${nodes.length}, edges=${edges.length}, filteredNodes=${filteredNodes.length}, filteredEdges=${filteredEdges.length}`);
            } catch (e) {}
        }
        return { flowNodes: filteredNodes, flowEdges: filteredEdges };
    }, [containers, networks, volumes, images, composeProjects, filters]);

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
                    <div className="relative">
                        <button
                            onClick={() => setFilterOpen(v => !v)}
                            aria-keyshortcuts="Shift+F"
                            className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center space-x-2"
                        >
                            <span>Filters</span>
                            <span className="text-xs text-gray-500 dark:text-gray-300 ml-2">Shift+F</span>
                        </button>
                        {filterOpen && (
                            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg p-3 z-50">
                                <div className="mb-2">
                                    <input
                                        type="text"
                                        placeholder="Search name..."
                                        value={filters.search}
                                        ref={searchInputRef}
                                        onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                                        className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                                    />
                                </div>

                                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">Resource Types</div>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {Object.keys(filters.resourceTypes).map((type) => (
                                        <label key={type} className="inline-flex items-center text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                            <input
                                                type="checkbox"
                                                checked={(filters.resourceTypes as any)[type]}
                                                onChange={(e) => setFilters(f => ({ ...f, resourceTypes: { ...f.resourceTypes, [type]: e.target.checked } }))}
                                                className="mr-2"
                                            />
                                            <span className="capitalize">{type}</span>
                                        </label>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between text-sm mb-2">
                                    <label className="inline-flex items-center">
                                        <input type="checkbox" checked={filters.runningOnly} onChange={(e) => setFilters(f => ({ ...f, runningOnly: e.target.checked }))} className="mr-2" />
                                        <span>Only running</span>
                                    </label>
                                    <label className="inline-flex items-center">
                                        <input type="checkbox" checked={filters.showOrphaned} onChange={(e) => setFilters(f => ({ ...f, showOrphaned: e.target.checked }))} className="mr-2" />
                                        <span>Show orphaned</span>
                                    </label>
                                </div>
                                <div className="flex items-center justify-between mt-3">
                                    <button onClick={() => setFilters({ resourceTypes: { container: true, network: true, volume: true, image: true, compose: true }, search: '', runningOnly: false, showOrphaned: true })} className="px-3 py-1 bg-gray-100 dark:bg-gray-600 rounded text-sm">Clear</button>
                                    <button onClick={() => setFilterOpen(false)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Close</button>
                                </div>
                            </div>
                        )}
                    </div>
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
                            <div className="flex flex-col items-end space-y-2">
                                <div className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-2 rounded shadow">
                                    Drag nodes to reposition • Zoom with mouse wheel
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-2 rounded shadow flex items-center space-x-3">
                                    {/* Compact legend for edge types */}
                                    <div className="flex items-center space-x-1">
                                        <div className="w-6 h-1 bg-blue-500 rounded" />
                                        <span className="select-none">Network</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <div className="w-6 h-1 bg-green-500 rounded" />
                                        <span className="select-none">C→N</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <div className="w-6 h-1 bg-orange-500 rounded" />
                                        <span className="select-none">Volume</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <div className="w-6 h-1 bg-indigo-500 rounded" />
                                        <span className="select-none">Image</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <div className="w-6 h-1 bg-purple-500 rounded" />
                                        <span className="select-none">Compose</span>
                                    </div>
                                </div>
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