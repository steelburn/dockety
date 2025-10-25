import Docker from 'dockerode';
import { SystemInfo, DockerStats, Container, ContainerState, Image, Volume, Network, ComposeProject, PruneReport } from './types';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function getContainersWithDetails(): Promise<Docker.ContainerInfo[]> {
    return docker.listContainers({ all: true });
}

export const dockerApiService = {
  async getSystemInfo(): Promise<SystemInfo> {
    const [info, version] = await Promise.all([docker.info(), docker.version()]);
    return {
      dockerVersion: version.Version,
      os: info.OperatingSystem,
      architecture: info.Architecture,
      cpus: info.NCPU,
      totalMemory: formatBytes(info.MemTotal),
    };
  },

  async getStats(): Promise<DockerStats> {
    const [containers, images, volumes, networks] = await Promise.all([
      docker.listContainers({ all: true }),
      docker.listImages(),
      docker.listVolumes(),
      docker.listNetworks(),
    ]);
    const runningContainers = containers.filter(c => c.State === 'running').length;
    const stoppedContainers = containers.length - runningContainers;

    return {
      runningContainers,
      stoppedContainers,
      totalContainers: containers.length,
      totalImages: images.length,
      totalVolumes: volumes.Volumes?.length || 0,
      totalNetworks: networks.length,
    };
  },

  async getContainers(): Promise<Container[]> {
    const containers = await getContainersWithDetails();
    return containers.map(c => ({
      id: c.Id,
      name: c.Names[0].substring(1),
      image: c.Image,
      state: c.State as ContainerState,
      status: c.Status,
      ports: c.Ports.map(p => ({
        privatePort: p.PrivatePort,
        publicPort: p.PublicPort,
        type: p.Type,
      })),
      created: new Date(c.Created * 1000).toISOString(),
      labels: c.Labels,
      composeProject: c.Labels['com.docker.compose.project'],
      volumes: c.Mounts.map(m => m.Name).filter(Boolean) as string[],
      network: Object.keys(c.NetworkSettings.Networks)[0] || 'N/A',
    }));
  },

  async getImages(): Promise<Image[]> {
      const allImages = await docker.listImages();
      const allContainers = await getContainersWithDetails();

      return allImages.map(img => {
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
  },
  
  async getVolumes(): Promise<Volume[]> {
      const { Volumes } = await docker.listVolumes();
      if (!Volumes) return [];

      const allContainers = await getContainersWithDetails();

      return Volumes.map(v => {
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
  },

  async getNetworks(): Promise<Network[]> {
      const allNetworks = await docker.listNetworks();
      const allContainers = await getContainersWithDetails();

      return allNetworks.map(n => {
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

          return {
              id: n.Id,
              name: n.Name,
              driver: n.Driver,
              scope: n.Scope,
              containers: containersOnNetwork,
              composeProjects: Array.from(composeProjects)
          };
      });
  },

  async getComposeProjects(): Promise<ComposeProject[]> {
      const containers = await this.getContainers();
      const projects: Record<string, Container[]> = {};
      containers.forEach(c => {
          if (c.composeProject) {
              if (!projects[c.composeProject]) {
                  projects[c.composeProject] = [];
              }
              projects[c.composeProject].push(c);
          }
      });
      return Object.keys(projects).map(name => ({
          name,
          containers: projects[name],
          composeFile: "# Editing compose files from the UI is not supported in the live backend.",
      }));
  },
  
  getContainerLogs: (containerId: string): Promise<string> => {
      const container = docker.getContainer(containerId);
      return container.logs({ stdout: true, stderr: true, tail: 200 }).then(logStream => {
          // The log stream is a Buffer, we need to convert it to a string.
          // The first 8 bytes of the stream are a header that needs to be stripped.
          // FIX: Check for Buffer without having @types/node by using globalThis.
          if ((globalThis as any).Buffer?.isBuffer(logStream)) {
             return (logStream as any).toString('utf8');
          }
          // Handle cases where it might not be a buffer (though it usually is)
          return String(logStream);
      });
  },
  
  // --- Actions ---
  startContainer: (id: string) => docker.getContainer(id).start(),
  stopContainer: (id: string) => docker.getContainer(id).stop(),
  restartContainer: (id: string) => docker.getContainer(id).restart(),
  removeContainer: (id: string) => docker.getContainer(id).remove({ force: true }),
  removeImage: (id: string) => docker.getImage(id).remove({ force: true }),
  removeVolume: (name: string) => docker.getVolume(name).remove(),
  pullImage: (imageName: string) => docker.pull(imageName, {}),
  createNetwork: (name: string, driver: string) => docker.createNetwork({ Name: name, Driver: driver }),

  async pruneSystem(options: { volumes: boolean }): Promise<PruneReport> {
    const [prunedContainers, prunedImages, prunedVolumes] = await Promise.all([
        docker.pruneContainers(),
        docker.pruneImages({ filters: { dangling: { false: true } } }),
        options.volumes ? docker.pruneVolumes() : Promise.resolve({ VolumesDeleted: null, SpaceReclaimed: 0 })
    ]);

    const totalSpaceReclaimed = (prunedContainers.SpaceReclaimed || 0) + (prunedImages.SpaceReclaimed || 0) + (prunedVolumes.SpaceReclaimed || 0);

    return {
        spaceReclaimed: formatBytes(totalSpaceReclaimed),
        itemsDeleted: {
            containers: prunedContainers.ContainersDeleted?.length || 0,
            images: prunedImages.ImagesDeleted?.length || 0,
            volumes: prunedVolumes.VolumesDeleted?.length || 0,
        },
    };
  }
};