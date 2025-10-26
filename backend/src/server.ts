import express from 'express';
import cors from 'cors';
import { databaseService } from './database';
import { dockerApiService, initializeDockerInstances } from './dockerApi';
import { Host } from './types';

const app = express();
const port = 3001;

// Logging utility
const log = {
    info: (message: string, ...args: any[]) => console.log(`[INFO] ${new Date().toISOString()} ${message}`, ...args),
    debug: (message: string, ...args: any[]) => console.log(`[DEBUG] ${new Date().toISOString()} ${message}`, ...args),
    warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${new Date().toISOString()} ${message}`, ...args),
    error: (message: string, ...args: any[]) => console.error(`[ERROR] ${new Date().toISOString()} ${message}`, ...args),
};

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    log.info(`${req.method} ${req.path} - Request started`);

    res.on('finish', () => {
        const duration = Date.now() - start;
        log.info(`${req.method} ${req.path} - Completed in ${duration}ms with status ${res.statusCode}`);
    });

    next();
});

// Wrapper for async routes
const asyncHandler = (fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<any>) =>
    (req: express.Request, res: express.Response, next: express.NextFunction) =>
        Promise.resolve(fn(req, res, next)).catch(next);

// --- Host Management (Database) ---
app.get('/hosts', (req, res) => {
    log.debug('Fetching all hosts');
    const hosts = databaseService.getHosts();
    log.info(`Retrieved ${hosts.length} hosts`);
    res.json(hosts);
});

app.post('/hosts', async (req, res) => {
    const { name, type = 'local', host, port, tls, socketProxy } = req.body;
    log.info(`Adding new host: ${name} (${type})`, { host, port, tls, socketProxy });
    const newHost = databaseService.addHost(name, type, host, port, tls, socketProxy);

    // Initialize Docker instance for the new host
    try {
        await initializeDockerInstances([newHost]);
        log.info(`Docker instance initialized for new host ${newHost.id}`);
    } catch (error) {
        log.error(`Failed to initialize Docker instance for new host ${newHost.id}:`, error);
    }

    log.info(`Host added successfully with ID: ${newHost.id}`);
    res.status(201).json(newHost);
});

app.put('/hosts/:id', async (req, res) => {
    const { name, type, host, port, tls, socketProxy } = req.body;
    log.info(`Updating host ${req.params.id}: ${name}`, { type, host, port, tls, socketProxy });
    const updatedHost = databaseService.updateHost(req.params.id, name, type, host, port, tls, socketProxy);

    // Re-initialize Docker instance for the updated host
    try {
        await initializeDockerInstances([updatedHost]);
        log.info(`Docker instance re-initialized for updated host ${updatedHost.id}`);
    } catch (error) {
        log.error(`Failed to re-initialize Docker instance for updated host ${updatedHost.id}:`, error);
    }

    log.info(`Host ${req.params.id} updated successfully`);
    res.json(updatedHost);
});

app.delete('/hosts/:id', (req, res) => {
    log.info(`Removing host ${req.params.id}`);
    databaseService.removeHost(req.params.id);
    log.info(`Host ${req.params.id} removed successfully`);
    res.status(204).send();
});

app.post('/hosts/:id/test', asyncHandler(async (req, res) => {
    const host = databaseService.getHosts().find(h => h.id === req.params.id);
    if (!host) {
        log.warn(`Host ${req.params.id} not found for connection test`);
        return res.status(404).json({ error: 'Host not found' });
    }
    log.info(`Testing connection to host ${req.params.id} (${host.name})`);
    const result = await dockerApiService.testHostConnection(host);
    databaseService.updateHostStatus(req.params.id, result.status);
    log.info(`Connection test for host ${req.params.id} completed with status: ${result.status}`);
    res.json(result);
}));

app.post('/hosts/test', asyncHandler(async (req, res) => {
    const { name, type, host, port, tls, socketProxy } = req.body;
    log.info(`Testing connection to new host configuration: ${name} (${type})`);

    // Create a temporary host object for testing
    const tempHost: Host = {
        id: 'temp', // Temporary ID for testing
        name: name || 'Test Host',
        type: type || 'local',
        host: host,
        port: port,
        tls: tls || false,
        socketProxy: socketProxy || false,
        status: 'unknown',
        lastChecked: new Date().toISOString()
    };

    const result = await dockerApiService.testHostConnection(tempHost);
    log.info(`Connection test for new host configuration completed with status: ${result.status}`);
    res.json(result);
}));// --- Docker Data ---
app.get('/system/info', asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching Docker system info for host ${hostId || 'local'}`);
    const info = await dockerApiService.getSystemInfo(hostId);
    log.info('Docker system info retrieved successfully');
    res.json(info);
}));

app.get('/system/stats', asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching Docker system stats for host ${hostId || 'local'}`);
    const stats = await dockerApiService.getStats(hostId);
    log.info(`Docker stats: ${stats.totalContainers} containers, ${stats.totalImages} images`);
    res.json(stats);
}));

app.get('/containers', asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching containers list for host ${hostId || 'local'}`);
    const containers = await dockerApiService.getContainers(hostId);
    log.info(`Retrieved ${containers.length} containers`);
    res.json(containers);
}));

app.get('/images', asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching images list for host ${hostId || 'local'}`);
    const images = await dockerApiService.getImages(hostId);
    log.info(`Retrieved ${images.length} images`);
    res.json(images);
}));

app.get('/volumes', asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching volumes list for host ${hostId || 'local'}`);
    const volumes = await dockerApiService.getVolumes(hostId);
    log.info(`Retrieved ${volumes.length} volumes`);
    res.json(volumes);
}));

app.get('/networks', asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching networks list for host ${hostId || 'local'}`);
    const networks = await dockerApiService.getNetworks(hostId);
    log.info(`Retrieved ${networks.length} networks`);
    res.json(networks);
}));

app.get('/compose', asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching compose projects for host ${hostId || 'local'}`);
    const projects = await dockerApiService.getComposeProjects(hostId);
    log.info(`Retrieved ${projects.length} compose projects`);
    res.json(projects);
}));

app.get('/containers/:id/logs', asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching logs for container ${req.params.id} on host ${hostId || 'local'}`);
    const logs = await dockerApiService.getContainerLogs(req.params.id, hostId);
    log.info(`Retrieved logs for container ${req.params.id} (${logs.length} characters)`);
    res.type('text/plain').send(logs);
}));

app.get('/images/:id/inspect', asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Inspecting image ${req.params.id} on host ${hostId || 'local'}`);
    const inspect = await dockerApiService.getImageInspect(req.params.id, hostId);
    log.info(`Image ${req.params.id} inspection completed`);
    res.json(inspect);
}));

app.get('/images/:id/history', asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching history for image ${req.params.id} on host ${hostId || 'local'}`);
    const history = await dockerApiService.getImageHistory(req.params.id, hostId);
    log.info(`Retrieved ${history.length} history entries for image ${req.params.id}`);
    res.json(history);
}));

app.get('/containers/:id/stats', asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching stats for container ${req.params.id} on host ${hostId || 'local'}`);
    const stats = await dockerApiService.getContainerStats(req.params.id, hostId);
    log.info(`Container ${req.params.id} stats retrieved`);
    res.json(stats);
}));

// --- Docker Actions ---
app.post('/containers/:id/start', asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Starting container ${req.params.id} on host ${hostId || 'local'}`);
    await dockerApiService.startContainer(req.params.id, hostId);
    log.info(`Container ${req.params.id} started successfully`);
    res.status(204).send();
}));

app.post('/containers/:id/stop', asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Stopping container ${req.params.id} on host ${hostId || 'local'}`);
    await dockerApiService.stopContainer(req.params.id, hostId);
    log.info(`Container ${req.params.id} stopped successfully`);
    res.status(204).send();
}));

app.post('/containers/:id/restart', asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Restarting container ${req.params.id} on host ${hostId || 'local'}`);
    await dockerApiService.restartContainer(req.params.id, hostId);
    log.info(`Container ${req.params.id} restarted successfully`);
    res.status(204).send();
}));

app.delete('/containers/:id', asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Removing container ${req.params.id} on host ${hostId || 'local'}`);
    await dockerApiService.removeContainer(req.params.id, hostId);
    log.info(`Container ${req.params.id} removed successfully`);
    res.status(204).send();
}));

app.delete('/images/:id', asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Removing image ${req.params.id} on host ${hostId || 'local'}`);
    await dockerApiService.removeImage(req.params.id, hostId);
    log.info(`Image ${req.params.id} removed successfully`);
    res.status(204).send();
}));

app.delete('/volumes/:name', asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Removing volume ${req.params.name} on host ${hostId || 'local'}`);
    await dockerApiService.removeVolume(req.params.name, hostId);
    log.info(`Volume ${req.params.name} removed successfully`);
    res.status(204).send();
}));

app.post('/images/pull', asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Pulling image ${req.body.name} on host ${hostId || 'local'}`);
    await dockerApiService.pullImage(req.body.name, hostId);
    log.info(`Image ${req.body.name} pulled successfully`);
    res.status(204).send();
}));

app.post('/networks', asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Creating network ${req.body.name} with driver ${req.body.driver} on host ${hostId || 'local'}`);
    await dockerApiService.createNetwork(req.body.name, req.body.driver, hostId);
    log.info(`Network ${req.body.name} created successfully`);
    res.status(204).send();
}));

app.post('/system/prune', asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Starting system prune operation on host ${hostId || 'local'}`, req.body);
    const report = await dockerApiService.pruneSystem(req.body, hostId);
    log.info('System prune completed', report);
    res.json(report);
}));

app.post('/containers/:id/exec', asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Executing command in container ${req.params.id} on host ${hostId || 'local'}: ${JSON.stringify(req.body.command)}`);
    const output = await dockerApiService.execCommand(req.params.id, req.body.command, hostId);
    log.info(`Command executed in container ${req.params.id}, output length: ${output.length}`);
    res.json({ output });
}));

// --- Health checks ---
app.get('/health', (req, res) => {
    log.debug('Health check requested');
    const response = { status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() };
    log.debug('Health check response', response);
    res.json(response);
});

app.get('/api/health', (req, res) => {
    log.debug('API health check requested');
    const response = { status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() };
    log.debug('API health check response', response);
    res.json(response);
});

// --- Error Handling ---
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    log.error(`Request error: ${err.message}`, {
        method: req.method,
        path: req.path,
        stack: err.stack
    });
    // Dockerode often includes the status code in the error object
    const statusCode = (err as any).statusCode || 500;
    res.status(statusCode).json({ error: err.message });
});


app.listen(port, async () => {
    log.info(`Dockety backend listening on port ${port}`);

    // Initialize Docker instances for all configured hosts
    try {
        const hosts = databaseService.getHosts();
        await initializeDockerInstances(hosts);
        log.info('Docker instances initialized for all hosts');
    } catch (error) {
        log.error('Failed to initialize Docker instances:', error);
    }

    log.info('Available endpoints:');
    log.info('  Host Management: GET/POST/PUT/DELETE /hosts, POST /hosts/:id/test, POST /hosts/test');
    log.info('  Docker Data: GET /system/*, GET /containers, GET /images, GET /volumes, GET /networks');
    log.info('  Docker Actions: POST /containers/:id/*, DELETE /containers/:id, POST /images/pull, etc.');
    log.info('  Health: GET /health, GET /api/health');
});
