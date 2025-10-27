import Docker from 'dockerode';
import { SystemInfo, DockerStats, Container, ContainerState, Image, Volume, Network, ComposeProject, PruneReport, Host } from './types';
import { databaseService } from './database';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Logging utility
const log = {
    info: (message: string, ...args: any[]) => console.log(`[INFO] ${new Date().toISOString()} ${message}`, ...args),
    debug: (message: string, ...args: any[]) => console.log(`[DEBUG] ${new Date().toISOString()} ${message}`, ...args),
    warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${new Date().toISOString()} ${message}`, ...args),
    error: (message: string, ...args: any[]) => console.error(`[ERROR] ${new Date().toISOString()} ${message}`, ...args),
};

// Cache for Docker instances by host ID
const dockerInstances = new Map<string, Docker>();

function getDockerInstance(hostId?: string): Docker {
    if (!hostId || hostId === 'local-docker') {
        return docker; // Default local instance
    }

    if (dockerInstances.has(hostId)) {
        return dockerInstances.get(hostId)!;
    }

    // Try to create the instance on demand for remote hosts
    try {
        const hosts = databaseService.getHosts();
        const host = hosts.find((h: Host) => h.id === hostId);
        if (host && host.type === 'remote') {
            log.info(`Creating Docker instance on demand for remote host ${host.name} (${host.id})`);
            const instance = createDockerInstance(host);
            return instance;
        }
    } catch (error) {
        log.error(`Failed to create Docker instance for host ${hostId}:`, error);
    }

    // This should not happen in normal operation, but we'll handle it
    log.warn(`Docker instance not found for host ${hostId}, using default local instance`);
    return docker;
}

function createDockerInstance(host: Host): Docker {
    if (host.type === 'local') {
        return docker; // Use the default local instance
    } else if (host.type === 'remote' && host.host) {
        const protocol = host.tls ? 'https' : 'http';
        const port = host.port || 2376;
        log.debug(`Creating remote Docker connection: ${protocol}://${host.host}:${port}${host.socketProxy ? ' (via socket proxy)' : ''}`);

        const options: any = {
            host: host.host,
            port: port,
            protocol: protocol,
            version: host.socketProxy ? '' : undefined, // Disable API versioning for socket proxy
        };

        // Add API key header for socket proxy authentication
        if (host.socketProxy && host.apiKey) {
            options.headers = {
                'x-api-key': host.apiKey
            };
            log.debug(`Added x-api-key header for socket proxy authentication`);
        }

        const instance = new Docker(options);
        dockerInstances.set(host.id, instance);
        return instance;
    } else {
        throw new Error(`Invalid host configuration for ${host.name}`);
    }
}

// Initialize Docker instances for all hosts
async function initializeDockerInstances(hosts: Host[]): Promise<void> {
    log.info('Initializing Docker instances for all configured hosts');
    for (const host of hosts) {
        try {
            if (host.type === 'remote') {
                createDockerInstance(host);
                log.info(`Docker instance created for remote host ${host.name} (${host.id})`);
            } else {
                log.debug(`Skipping local host ${host.name} (${host.id}) - uses default instance`);
            }
        } catch (error) {
            log.error(`Failed to create Docker instance for host ${host.name}:`, error);
        }
    }
}

function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function getContainersWithDetails(dockerInstance: Docker): Promise<Docker.ContainerInfo[]> {
    log.debug('Fetching detailed container information from Docker API');
    return dockerInstance.listContainers({ all: true });
}

export const dockerApiService = {
    async getSystemInfo(hostId?: string): Promise<SystemInfo> {
        log.debug(`Retrieving Docker system information for host ${hostId || 'local'}`);
        const dockerInstance = getDockerInstance(hostId);
        const [info, version] = await Promise.all([dockerInstance.info(), dockerInstance.version()]);
        log.info(`Docker system info for host ${hostId || 'local'}: ${version.Version} on ${info.OperatingSystem}`);
        return {
            dockerVersion: version.Version,
            os: info.OperatingSystem,
            architecture: info.Architecture,
            cpus: info.NCPU,
            totalMemory: formatBytes(info.MemTotal),
        };
    },

    async getStats(hostId?: string): Promise<DockerStats> {
        log.debug(`Calculating Docker system statistics for host ${hostId || 'local'}`);
        const dockerInstance = getDockerInstance(hostId);
        const [containers, images, volumes, networks] = await Promise.all([
            dockerInstance.listContainers({ all: true }),
            dockerInstance.listImages(),
            dockerInstance.listVolumes(),
            dockerInstance.listNetworks(),
        ]);
        const runningContainers = containers.filter(c => c.State === 'running').length;
        const stoppedContainers = containers.length - runningContainers;

        const stats = {
            runningContainers,
            stoppedContainers,
            totalContainers: containers.length,
            totalImages: images.length,
            totalVolumes: volumes.Volumes?.length || 0,
            totalNetworks: networks.length,
        };
        log.info(`Docker stats for host ${hostId || 'local'}: ${stats.runningContainers} running, ${stats.stoppedContainers} stopped containers, ${stats.totalImages} images`);
        return stats;
    },

    async getContainers(hostId?: string): Promise<Container[]> {
        log.debug(`Retrieving container list with metadata for host ${hostId || 'local'}`);
        const dockerInstance = getDockerInstance(hostId);
        const containers = await getContainersWithDetails(dockerInstance);
        const processedContainers = containers.map(c => ({
            id: c.Id,
            name: (c.Names && c.Names.length > 0) ? c.Names[0].substring(1) : 'unknown',
            image: c.Image,
            state: c.State as ContainerState,
            status: c.Status,
            ports: (c.Ports || []).map(p => ({
                privatePort: p.PrivatePort,
                publicPort: p.PublicPort,
                type: p.Type,
            })),
            created: new Date(c.Created * 1000).toISOString(),
            labels: c.Labels,
            composeProject: c.Labels['com.docker.compose.project'],
            volumes: (c.Mounts || []).map(m => m.Name).filter(Boolean) as string[],
            network: Object.keys(c.NetworkSettings.Networks)[0] || 'N/A',
        }));
        log.info(`Processed ${processedContainers.length} containers for host ${hostId || 'local'}`);
        return processedContainers;
    },

    async getImages(hostId?: string): Promise<Image[]> {
        log.debug(`Retrieving Docker images with usage information for host ${hostId || 'local'}`);
        const dockerInstance = getDockerInstance(hostId);
        const allImages = await dockerInstance.listImages();
        const allContainers = await getContainersWithDetails(dockerInstance);

        const processedImages = allImages.map(img => {
            const containersUsingImage = allContainers
                .filter(c => c.ImageID === img.Id)
                .map(c => c.Names[0].substring(1));

            return {
                id: img.Id,
                tags: img.RepoTags || ['<none>:<none>'],
                size: formatBytes(img.Size),
                created: new Date(img.Created * 1000).toISOString(),
                containers: containersUsingImage,
            };
        });
        log.info(`Processed ${processedImages.length} images for host ${hostId || 'local'}`);
        return processedImages;
    },

    async getVolumes(hostId?: string): Promise<Volume[]> {
        log.debug(`Retrieving Docker volumes with container associations for host ${hostId || 'local'}`);
        const dockerInstance = getDockerInstance(hostId);
        const { Volumes } = await dockerInstance.listVolumes();
        if (!Volumes) {
            log.debug('No volumes found');
            return [];
        }

        const allContainers = await getContainersWithDetails(dockerInstance);

        const processedVolumes = Volumes.map(v => {
            const containersUsingVolume = allContainers
                .filter(c => c.Mounts.some(m => m.Name === v.Name))
                .map(c => c.Names[0].substring(1));

            return {
                name: v.Name,
                driver: v.Driver,
                mountpoint: v.Mountpoint,
                containers: containersUsingVolume
            };
        });
        log.info(`Processed ${processedVolumes.length} volumes for host ${hostId || 'local'}`);
        return processedVolumes;
    },

    async getNetworks(hostId?: string): Promise<Network[]> {
        log.debug(`Retrieving Docker networks with detailed information for host ${hostId || 'local'}`);
        const dockerInstance = getDockerInstance(hostId);
        const allNetworks = await dockerInstance.listNetworks();
        const allContainers = await getContainersWithDetails(dockerInstance);

        const processedNetworks = await Promise.all(allNetworks.map(async n => {
            const containersOnNetwork: string[] = [];
            const composeProjects = new Set<string>();

            allContainers.forEach(c => {
                if (c.NetworkSettings.Networks[n.Name]) {
                    const containerName = c.Names[0].substring(1);
                    containersOnNetwork.push(containerName);
                    const projectName = c.Labels['com.docker.compose.project'];
                    if (projectName) {
                        composeProjects.add(projectName);
                    }
                }
            });

            // Get detailed network information
            let networkDetails;
            try {
                const network = dockerInstance.getNetwork(n.Id);
                networkDetails = await network.inspect();
            } catch (error) {
                log.warn(`Failed to inspect network ${n.Name}:`, error);
                networkDetails = null;
            }

            return {
                id: n.Id,
                name: n.Name,
                driver: n.Driver,
                scope: n.Scope,
                containers: containersOnNetwork,
                composeProjects: Array.from(composeProjects),
                ipam: networkDetails?.IPAM,
                internal: networkDetails?.Internal,
                attachable: networkDetails?.Attachable,
                ingress: networkDetails?.Ingress,
                configOnly: networkDetails?.ConfigOnly,
                configFrom: networkDetails?.ConfigFrom,
                options: networkDetails?.Options,
                labels: networkDetails?.Labels,
                created: networkDetails?.Created
            };
        }));
        log.info(`Processed ${processedNetworks.length} networks with detailed information for host ${hostId || 'local'}`);
        return processedNetworks;
    },

    async getComposeProjects(hostId?: string): Promise<ComposeProject[]> {
        log.debug(`Analyzing containers for Docker Compose projects for host ${hostId || 'local'}`);
        const containers = await this.getContainers(hostId);
        const projects: Record<string, Container[]> = {};
        containers.forEach(c => {
            if (c.composeProject) {
                if (!projects[c.composeProject]) {
                    projects[c.composeProject] = [];
                }
                projects[c.composeProject].push(c);
            }
        });
        const projectList = Object.keys(projects).map(name => ({
            name,
            containers: projects[name],
            composeFile: "# Editing compose files from the UI is not supported in the live backend.",
        }));
        log.info(`Found ${projectList.length} Docker Compose projects for host ${hostId || 'local'}`);
        return projectList;
    },

    getContainerLogs: (containerId: string, hostId?: string): Promise<string> => {
        log.debug(`Retrieving logs for container ${containerId} on host ${hostId || 'local'}`);
        const dockerInstance = getDockerInstance(hostId);
        const container = dockerInstance.getContainer(containerId);
        return container.logs({ stdout: true, stderr: true, tail: 200 }).then(logStream => {
            // The log stream is a Buffer, we need to convert it to a string.
            // The first 8 bytes of the stream are a header that needs to be stripped.
            // FIX: Check for Buffer without having @types/node by using globalThis.
            if ((globalThis as any).Buffer?.isBuffer(logStream)) {
                const logString = (logStream as any).toString('utf8');
                log.info(`Retrieved ${logString.length} characters of logs for container ${containerId} on host ${hostId || 'local'}`);
                return logString;
            }
            // Handle cases where it might not be a buffer (though it usually is)
            log.warn(`Log stream for container ${containerId} is not a buffer`);
            return String(logStream);
        });
    },

    async execCommand(containerId: string, command: string[], hostId?: string): Promise<string> {
        log.info(`Executing command in container ${containerId} on host ${hostId || 'local'}: ${command.join(' ')}`);
        const dockerInstance = getDockerInstance(hostId);
        const container = dockerInstance.getContainer(containerId);
        const exec = await container.exec({
            Cmd: command,
            AttachStdout: true,
            AttachStderr: true,
        });
        const stream = await exec.start({ hijack: true, stdin: false });
        return new Promise((resolve, reject) => {
            let output = '';
            stream.on('data', (chunk: Buffer) => {
                // Remove the 8-byte header
                output += chunk.slice(8).toString('utf8');
            });
            stream.on('end', () => {
                log.info(`Command execution completed in container ${containerId} on host ${hostId || 'local'}, output length: ${output.length}`);
                resolve(output);
            });
            stream.on('error', (error) => {
                log.error(`Command execution failed in container ${containerId} on host ${hostId || 'local'}:`, error);
                reject(error);
            });
        });
    },

    // --- Actions ---
    startContainer: (id: string, hostId?: string) => {
        log.info(`Starting container ${id} on host ${hostId || 'local'}`);
        const dockerInstance = getDockerInstance(hostId);
        return dockerInstance.getContainer(id).start();
    },
    stopContainer: (id: string, hostId?: string) => {
        log.info(`Stopping container ${id} on host ${hostId || 'local'}`);
        const dockerInstance = getDockerInstance(hostId);
        return dockerInstance.getContainer(id).stop();
    },
    restartContainer: (id: string, hostId?: string) => {
        log.info(`Restarting container ${id} on host ${hostId || 'local'}`);
        const dockerInstance = getDockerInstance(hostId);
        return dockerInstance.getContainer(id).restart();
    },
    removeContainer: (id: string, hostId?: string) => {
        log.info(`Removing container ${id} on host ${hostId || 'local'}`);
        const dockerInstance = getDockerInstance(hostId);
        return dockerInstance.getContainer(id).remove({ force: true });
    },
    removeImage: (id: string, hostId?: string) => {
        log.info(`Removing image ${id} on host ${hostId || 'local'}`);
        const dockerInstance = getDockerInstance(hostId);
        return dockerInstance.getImage(id).remove({ force: true });
    },
    removeVolume: (name: string, hostId?: string) => {
        log.info(`Removing volume ${name} on host ${hostId || 'local'}`);
        const dockerInstance = getDockerInstance(hostId);
        return dockerInstance.getVolume(name).remove();
    },
    pullImage: (imageName: string, hostId?: string) => {
        log.info(`Pulling image ${imageName} on host ${hostId || 'local'}`);
        const dockerInstance = getDockerInstance(hostId);
        return dockerInstance.pull(imageName, {});
    },
    createNetwork: (name: string, driver: string, hostId?: string) => {
        log.info(`Creating network ${name} with driver ${driver} on host ${hostId || 'local'}`);
        const dockerInstance = getDockerInstance(hostId);
        return dockerInstance.createNetwork({ Name: name, Driver: driver });
    },

    async pruneSystem(options: { volumes: boolean }, hostId?: string): Promise<PruneReport> {
        log.info(`Starting Docker system prune operation on host ${hostId || 'local'}`, options);
        const dockerInstance = getDockerInstance(hostId);
        const [prunedContainers, prunedImages, prunedVolumes] = await Promise.all([
            dockerInstance.pruneContainers(),
            dockerInstance.pruneImages({ filters: { dangling: { false: true } } }),
            options.volumes ? dockerInstance.pruneVolumes() : Promise.resolve({ VolumesDeleted: null, SpaceReclaimed: 0 })
        ]);

        const totalSpaceReclaimed = (prunedContainers.SpaceReclaimed || 0) + (prunedImages.SpaceReclaimed || 0) + (prunedVolumes.SpaceReclaimed || 0);

        const report = {
            spaceReclaimed: formatBytes(totalSpaceReclaimed),
            itemsDeleted: {
                containers: prunedContainers.ContainersDeleted?.length || 0,
                images: prunedImages.ImagesDeleted?.length || 0,
                volumes: prunedVolumes.VolumesDeleted?.length || 0,
            },
        };
        log.info(`System prune completed on host ${hostId || 'local'}`, report);
        return report;
    },

    async getImageInspect(imageId: string, hostId?: string): Promise<any> {
        log.debug(`Inspecting image ${imageId} on host ${hostId || 'local'}`);
        const dockerInstance = getDockerInstance(hostId);
        const image = dockerInstance.getImage(imageId);
        const inspect = await image.inspect();
        log.info(`Image ${imageId} inspection completed on host ${hostId || 'local'}`);
        return inspect;
    },

    async getImageHistory(imageId: string, hostId?: string): Promise<any[]> {
        log.debug(`Retrieving history for image ${imageId} on host ${hostId || 'local'}`);
        const dockerInstance = getDockerInstance(hostId);
        const image = dockerInstance.getImage(imageId);
        const history = await image.history();
        log.info(`Retrieved ${history.length} history entries for image ${imageId} on host ${hostId || 'local'}`);
        return history;
    },

    async getContainerStats(containerId: string, hostId?: string): Promise<any> {
        log.debug(`Retrieving real-time stats for container ${containerId} on host ${hostId || 'local'}`);
        const dockerInstance = getDockerInstance(hostId);
        const container = dockerInstance.getContainer(containerId);

        try {
            const statsStream = await container.stats({ stream: false }); // Disable streaming for a single snapshot

            // Sanitize the stats data
            const sanitizedStats = {
                cpuUsage: statsStream.cpu_stats.cpu_usage.total_usage,
                memoryUsage: statsStream.memory_stats.usage,
                network: statsStream.networks,
            };

            log.info(`Container ${containerId} stats retrieved on host ${hostId || 'local'}`);
            return sanitizedStats;
        } catch (error) {
            log.error(`Failed to retrieve stats for container ${containerId} on host ${hostId || 'local'}`, error);
            throw new Error('Unable to fetch container stats');
        }
    },

    async testHostConnection(host: Host): Promise<{ status: 'connected' | 'disconnected' | 'error'; error?: string }> {
        log.info(`Testing connection to host ${host.name} (${host.type})`);
        try {
            let dockerInstance: Docker;

            if (host.type === 'local') {
                log.debug('Using local Docker socket connection');
                dockerInstance = docker; // Use the default local instance
            } else if (host.type === 'remote' && host.host) {
                // Check if we already have a cached instance
                if (dockerInstances.has(host.id)) {
                    dockerInstance = dockerInstances.get(host.id)!;
                } else {
                    dockerInstance = createDockerInstance(host);
                }
            } else {
                log.warn(`Invalid host configuration for ${host.name}`);
                return { status: 'error', error: 'Invalid host configuration' };
            }

            // Test connection by trying to get system info
            log.debug(`Pinging Docker daemon for host ${host.name}`);
            await dockerInstance.ping();
            log.info(`Connection test successful for host ${host.name}`);
            return { status: 'connected' };
        } catch (error) {
            log.error(`Host connection test failed for ${host.name}:`, error);
            return {
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    },
};

export { initializeDockerInstances };