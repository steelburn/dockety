import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { databaseService } from './database';
import { dockerApiService, initializeDockerInstances } from './dockerApi';
import { Host } from './types';

const app = express();
const port = 3001;
const JWT_SECRET = 'dockety-secret-key'; // TODO: Use environment variable in production

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

// Authentication middleware
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        (req as any).user = user;
        next();
    });
};

// Wrapper for async routes
const asyncHandler = (fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<any>) =>
    (req: express.Request, res: express.Response, next: express.NextFunction) =>
        Promise.resolve(fn(req, res, next)).catch(next);

// --- Authentication ---
app.post('/auth/register', asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    const existingUser = databaseService.getUserByUsername(username);
    if (existingUser) {
        return res.status(409).json({ error: 'Username already exists' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const user = databaseService.createUser(username, passwordHash);

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    log.info(`User ${username} registered successfully`);
    res.status(201).json({ token, user: { id: user.id, username: user.username } });
}));

app.post('/auth/login', asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    const user = databaseService.getUserByUsername(username);
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    log.info(`User ${username} logged in successfully`);
    res.json({ token, user: { id: user.id, username: user.username } });
}));

// --- User Management ---
app.get('/users', authenticateToken, asyncHandler(async (req, res) => {
    log.debug('Retrieving all users');
    // For now, allow any authenticated user to see all users
    // In a real app, you'd check for admin role
    const users = databaseService.getAllUsers();
    log.info(`Retrieved ${users.length} users`);
    res.json(users.map(u => ({ id: u.id, username: u.username, createdAt: u.createdAt })));
}));

app.delete('/users/:id', authenticateToken, asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const currentUserId = (req as any).user.id;

    if (userId === currentUserId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    log.info(`Deleting user ${userId}`);
    databaseService.deleteUser(userId);
    log.info(`User ${userId} deleted successfully`);
    res.status(204).send();
}));

app.put('/auth/change-password', authenticateToken, asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = (req as any).user.id;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password required' });
    }

    const user = databaseService.getUserById(userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    databaseService.updateUserPassword(userId, newPasswordHash);

    log.info(`Password changed for user ${userId}`);
    res.json({ message: 'Password changed successfully' });
}));

// --- Host Management (Database) ---
app.get('/hosts', authenticateToken, (req, res) => {
    log.debug('Fetching all hosts');
    const hosts = databaseService.getHosts();
    log.info(`Retrieved ${hosts.length} hosts`);
    res.json(hosts);
});

app.post('/hosts', authenticateToken, async (req, res) => {
    const { name, type = 'local', host, port, tls, socketProxy, apiKey } = req.body;
    log.info(`Adding new host: ${name} (${type})`, { host, port, tls, socketProxy, apiKey: apiKey ? '[REDACTED]' : undefined });
    const newHost = databaseService.addHost(name, type, host, port, tls, socketProxy, apiKey);

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

app.put('/hosts/:id', authenticateToken, async (req, res) => {
    const { name, type, host, port, tls, socketProxy, apiKey } = req.body;
    log.info(`Updating host ${req.params.id}: ${name}`, { type, host, port, tls, socketProxy, apiKey: apiKey ? '[REDACTED]' : undefined });
    const updatedHost = databaseService.updateHost(req.params.id, name, type, host, port, tls, socketProxy, apiKey);

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

app.delete('/hosts/:id', authenticateToken, (req, res) => {
    log.info(`Removing host ${req.params.id}`);
    databaseService.removeHost(req.params.id);
    log.info(`Host ${req.params.id} removed successfully`);
    res.status(204).send();
});

app.post('/hosts/:id/test', authenticateToken, asyncHandler(async (req, res) => {
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

app.post('/hosts/test', authenticateToken, asyncHandler(async (req, res) => {
    const { name, type, host, port, tls, socketProxy, apiKey } = req.body;
    log.info(`Testing connection to new host configuration: ${name} (${type})`, { apiKey: apiKey ? '[REDACTED]' : undefined });

    // Create a temporary host object for testing
    const tempHost: Host = {
        id: 'temp', // Temporary ID for testing
        name: name || 'Test Host',
        type: type || 'local',
        host: host,
        port: port,
        tls: tls || false,
        socketProxy: socketProxy || false,
        apiKey: apiKey,
        status: 'unknown',
        lastChecked: new Date().toISOString()
    };

    const result = await dockerApiService.testHostConnection(tempHost);
    log.info(`Connection test for new host configuration completed with status: ${result.status}`);
    res.json(result);
}));// --- Docker Data ---
app.get('/system/info', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching Docker system info for host ${hostId || 'local'}`);
    const info = await dockerApiService.getSystemInfo(hostId);
    log.info('Docker system info retrieved successfully');
    res.json(info);
}));

app.get('/system/stats', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching Docker system stats for host ${hostId || 'local'}`);
    const stats = await dockerApiService.getStats(hostId);
    log.info(`Docker stats: ${stats.totalContainers} containers, ${stats.totalImages} images`);
    res.json(stats);
}));

app.get('/containers', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching containers list for host ${hostId || 'local'}`);
    const containers = await dockerApiService.getContainers(hostId);
    log.info(`Retrieved ${containers.length} containers`);
    res.json(containers);
}));

app.get('/images', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching images list for host ${hostId || 'local'}`);
    const images = await dockerApiService.getImages(hostId);
    log.info(`Retrieved ${images.length} images`);
    res.json(images);
}));

app.get('/volumes', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching volumes list for host ${hostId || 'local'}`);
    const volumes = await dockerApiService.getVolumes(hostId);
    log.info(`Retrieved ${volumes.length} volumes`);
    res.json(volumes);
}));

app.get('/networks', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching networks list for host ${hostId || 'local'}`);
    const networks = await dockerApiService.getNetworks(hostId);
    log.info(`Retrieved ${networks.length} networks`);
    res.json(networks);
}));

app.get('/compose', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching compose projects for host ${hostId || 'local'}`);
    const projects = await dockerApiService.getComposeProjects(hostId);
    log.info(`Retrieved ${projects.length} compose projects`);
    res.json(projects);
}));

app.get('/containers/:id/logs', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching logs for container ${req.params.id} on host ${hostId || 'local'}`);
    const logs = await dockerApiService.getContainerLogs(req.params.id, hostId);
    log.info(`Retrieved logs for container ${req.params.id} (${logs.length} characters)`);
    res.type('text/plain').send(logs);
}));

app.get('/images/:id/inspect', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Inspecting image ${req.params.id} on host ${hostId || 'local'}`);
    const inspect = await dockerApiService.getImageInspect(req.params.id, hostId);
    log.info(`Image ${req.params.id} inspection completed`);
    res.json(inspect);
}));

app.get('/images/:id/history', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching history for image ${req.params.id} on host ${hostId || 'local'}`);
    const history = await dockerApiService.getImageHistory(req.params.id, hostId);
    log.info(`Retrieved ${history.length} history entries for image ${req.params.id}`);
    res.json(history);
}));

app.get('/containers/:id/stats', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching stats for container ${req.params.id} on host ${hostId || 'local'}`);
    const stats = await dockerApiService.getContainerStats(req.params.id, hostId);
    log.info(`Container ${req.params.id} stats retrieved`);
    res.json(stats);
}));

// --- Docker Actions ---
app.post('/containers/:id/start', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Starting container ${req.params.id} on host ${hostId || 'local'}`);
    await dockerApiService.startContainer(req.params.id, hostId);
    log.info(`Container ${req.params.id} started successfully`);
    res.status(204).send();
}));

app.post('/containers/:id/stop', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Stopping container ${req.params.id} on host ${hostId || 'local'}`);
    await dockerApiService.stopContainer(req.params.id, hostId);
    log.info(`Container ${req.params.id} stopped successfully`);
    res.status(204).send();
}));

app.post('/containers/:id/restart', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Restarting container ${req.params.id} on host ${hostId || 'local'}`);
    await dockerApiService.restartContainer(req.params.id, hostId);
    log.info(`Container ${req.params.id} restarted successfully`);
    res.status(204).send();
}));

app.delete('/containers/:id', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Removing container ${req.params.id} on host ${hostId || 'local'}`);
    await dockerApiService.removeContainer(req.params.id, hostId);
    log.info(`Container ${req.params.id} removed successfully`);
    res.status(204).send();
}));

app.delete('/images/:id', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Removing image ${req.params.id} on host ${hostId || 'local'}`);
    await dockerApiService.removeImage(req.params.id, hostId);
    log.info(`Image ${req.params.id} removed successfully`);
    res.status(204).send();
}));

app.delete('/volumes/:name', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Removing volume ${req.params.name} on host ${hostId || 'local'}`);
    await dockerApiService.removeVolume(req.params.name, hostId);
    log.info(`Volume ${req.params.name} removed successfully`);
    res.status(204).send();
}));

app.post('/images/pull', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Pulling image ${req.body.name} on host ${hostId || 'local'}`);
    await dockerApiService.pullImage(req.body.name, hostId);
    log.info(`Image ${req.body.name} pulled successfully`);
    res.status(204).send();
}));

app.post('/networks', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Creating network ${req.body.name} with driver ${req.body.driver} on host ${hostId || 'local'}`);
    await dockerApiService.createNetwork(req.body.name, req.body.driver, hostId);
    log.info(`Network ${req.body.name} created successfully`);
    res.status(204).send();
}));

app.post('/system/prune', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Starting system prune operation on host ${hostId || 'local'}`, req.body);
    const report = await dockerApiService.pruneSystem(req.body, hostId);
    log.info('System prune completed', report);
    res.json(report);
}));

app.post('/containers/:id/exec', authenticateToken, asyncHandler(async (req, res) => {
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
