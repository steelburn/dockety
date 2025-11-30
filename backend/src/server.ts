// IMPORTANT: Make sure to import `instrument.js` at the top of your file.
// If you're using ECMAScript Modules (ESM) syntax, use `import "./instrument.js";`
require("./instrument.js");

import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { databaseService } from './database';
import { dockerApiService, initializeDockerInstances } from './dockerApi';
import { Host } from './types';

// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
import * as Sentry from "@sentry/node";

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);
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

// Authorization middleware for admin/owner roles
const requireAdminOrOwner = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user;
    if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
        return res.status(403).json({ error: 'Admin or owner privileges required' });
    }
    next();
};

// Authorization middleware for owner role only
const requireOwner = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user;
    if (!user || user.role !== 'owner') {
        return res.status(403).json({ error: 'Owner privileges required' });
    }
    next();
};

// Wrapper for async routes
const asyncHandler = (fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<any>) =>
    (req: express.Request, res: express.Response, next: express.NextFunction) =>
        Promise.resolve(fn(req, res, next)).catch(next);

// --- Authentication ---
app.get('/api/auth/is-first-user', asyncHandler(async (req, res) => {
    const userCount = databaseService.getUserCount();
    res.json({ isFirstUser: userCount === 0 });
}));

app.post('/api/auth/register', asyncHandler(async (req, res) => {
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

    // Check if this is the first user (becomes owner automatically)
    const userCount = databaseService.getUserCount();
    const isFirstUser = userCount === 0;
    const role = isFirstUser ? 'owner' : 'user';
    const isApproved = isFirstUser; // First user is automatically approved

    const user = databaseService.createUser(username, passwordHash, role, isApproved);

    if (isFirstUser) {
        log.info(`First user ${username} registered as owner and automatically approved`);
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ token, user: { id: user.id, username: user.username, role: user.role, isApproved: user.isApproved } });
    } else {
        log.info(`User ${username} registered and pending approval`);
        res.status(201).json({
            message: 'Registration successful. Your account is pending approval by an administrator.',
            user: { id: user.id, username: user.username, role: user.role, isApproved: user.isApproved }
        });
    }
}));

app.post('/api/auth/login', asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    const user = databaseService.getUserByUsername(username);
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isApproved) {
        return res.status(403).json({ error: 'Your account is pending approval by an administrator.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    log.info(`User ${username} logged in successfully`);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, isApproved: user.isApproved } });
}));

// --- User Management ---
app.get('/api/users', authenticateToken, requireAdminOrOwner, asyncHandler(async (req, res) => {
    log.debug('Retrieving all users');
    const users = databaseService.getAllUsers();
    log.info(`Retrieved ${users.length} users`);
    res.json(users.map(u => ({ id: u.id, username: u.username, role: u.role, isApproved: u.isApproved, createdAt: u.createdAt })));
}));

app.get('/api/users/pending', authenticateToken, requireAdminOrOwner, asyncHandler(async (req, res) => {
    log.debug('Retrieving pending users');
    const users = databaseService.getPendingUsers();
    log.info(`Retrieved ${users.length} pending users`);
    res.json(users.map(u => ({ id: u.id, username: u.username, role: u.role, isApproved: u.isApproved, createdAt: u.createdAt })));
}));

app.post('/api/users/:id/approve', authenticateToken, requireAdminOrOwner, asyncHandler(async (req, res) => {
    const userId = req.params.id;
    log.info(`Approving user ${userId}`);
    databaseService.updateUserApproval(userId, true);
    log.info(`User ${userId} approved successfully`);
    res.json({ message: 'User approved successfully' });
}));

app.put('/api/users/:id/role', authenticateToken, requireAdminOrOwner, asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const { role } = req.body;
    const currentUser = (req as any).user;

    if (!['admin', 'user'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be admin or user.' });
    }

    // Only owner can assign admin role
    if (role === 'admin' && currentUser.role !== 'owner') {
        return res.status(403).json({ error: 'Only owner can assign admin role' });
    }

    // Cannot change owner's role
    const targetUser = databaseService.getUserById(userId);
    if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.role === 'owner') {
        return res.status(403).json({ error: 'Cannot change owner role' });
    }

    log.info(`Updating role for user ${userId} to ${role}`);
    databaseService.updateUserRole(userId, role);
    log.info(`Role updated for user ${userId} to ${role}`);
    res.json({ message: 'User role updated successfully' });
}));

app.post('/api/users/transfer-ownership', authenticateToken, requireOwner, asyncHandler(async (req, res) => {
    const { newOwnerId } = req.body;
    const currentUser = (req as any).user;

    if (!newOwnerId) {
        return res.status(400).json({ error: 'New owner ID required' });
    }

    const newOwner = databaseService.getUserById(newOwnerId);
    if (!newOwner) {
        return res.status(404).json({ error: 'New owner user not found' });
    }

    if (!newOwner.isApproved) {
        return res.status(400).json({ error: 'Cannot transfer ownership to unapproved user' });
    }

    // Transfer ownership
    databaseService.updateUserRole(currentUser.id, 'admin');
    databaseService.updateUserRole(newOwnerId, 'owner');

    log.info(`Ownership transferred from ${currentUser.username} to ${newOwner.username}`);
    res.json({ message: 'Ownership transferred successfully' });
}));

app.delete('/api/users/:id', authenticateToken, requireAdminOrOwner, asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const currentUser = (req as any).user;

    if (userId === currentUser.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const targetUser = databaseService.getUserById(userId);
    if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.role === 'owner') {
        return res.status(403).json({ error: 'Cannot delete owner account' });
    }

    log.info(`Deleting user ${userId}`);
    databaseService.deleteUser(userId);
    log.info(`User ${userId} deleted successfully`);
    res.status(204).send();
}));

app.put('/api/auth/change-password', authenticateToken, asyncHandler(async (req, res) => {
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
app.get('/api/hosts', authenticateToken, (req, res) => {
    log.debug('Fetching all hosts');
    const hosts = databaseService.getHosts();
    log.info(`Retrieved ${hosts.length} hosts`);
    res.json(hosts);
});

app.post('/api/hosts', authenticateToken, async (req, res) => {
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

app.put('/api/hosts/:id', authenticateToken, async (req, res) => {
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

app.delete('/api/hosts/:id', authenticateToken, (req, res) => {
    log.info(`Removing host ${req.params.id}`);
    databaseService.removeHost(req.params.id);
    log.info(`Host ${req.params.id} removed successfully`);
    res.status(204).send();
});

app.post('/api/hosts/:id/test', authenticateToken, asyncHandler(async (req, res) => {
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

app.post('/api/hosts/test', authenticateToken, asyncHandler(async (req, res) => {
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
app.get('/api/system/info', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching Docker system info for host ${hostId || 'local'}`);
    const info = await dockerApiService.getSystemInfo(hostId);
    log.info('Docker system info retrieved successfully');
    res.json(info);
}));

app.get('/api/system/stats', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching Docker system stats for host ${hostId || 'local'}`);
    const stats = await dockerApiService.getStats(hostId);
    log.info(`Docker stats: ${stats.totalContainers} containers, ${stats.totalImages} images`);
    res.json(stats);
}));

app.get('/api/containers', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching containers list for host ${hostId || 'local'}`);
    const containers = await dockerApiService.getContainers(hostId);
    log.info(`Retrieved ${containers.length} containers`);
    res.json(containers);
}));

app.get('/api/images', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching images list for host ${hostId || 'local'}`);
    const images = await dockerApiService.getImages(hostId);
    log.info(`Retrieved ${images.length} images`);
    res.json(images);
}));

app.get('/api/volumes', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching volumes list for host ${hostId || 'local'}`);
    const volumes = await dockerApiService.getVolumes(hostId);
    log.info(`Retrieved ${volumes.length} volumes`);
    res.json(volumes);
}));

app.get('/api/networks', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching networks list for host ${hostId || 'local'}`);
    const networks = await dockerApiService.getNetworks(hostId);
    log.info(`Retrieved ${networks.length} networks`);
    res.json(networks);
}));

app.get('/api/compose', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching compose projects for host ${hostId || 'local'}`);
    const projects = await dockerApiService.getComposeProjects(hostId);
    log.info(`Retrieved ${projects.length} compose projects`);
    res.json(projects);
}));

app.get('/api/containers/:id/logs', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching logs for container ${req.params.id} on host ${hostId || 'local'}`);
    const logs = await dockerApiService.getContainerLogs(req.params.id, hostId);
    log.info(`Retrieved logs for container ${req.params.id} (${logs.length} characters)`);
    res.type('text/plain').send(logs);
}));

app.get('/api/images/:id/inspect', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Inspecting image ${req.params.id} on host ${hostId || 'local'}`);
    const inspect = await dockerApiService.getImageInspect(req.params.id, hostId);
    log.info(`Image ${req.params.id} inspection completed`);
    res.json(inspect);
}));

app.get('/api/images/:id/history', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching history for image ${req.params.id} on host ${hostId || 'local'}`);
    const history = await dockerApiService.getImageHistory(req.params.id, hostId);
    log.info(`Retrieved ${history.length} history entries for image ${req.params.id}`);
    res.json(history);
}));

app.get('/api/containers/:id/stats', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.debug(`Fetching stats for container ${req.params.id} on host ${hostId || 'local'}`);
    const stats = await dockerApiService.getContainerStats(req.params.id, hostId);
    log.info(`Container ${req.params.id} stats retrieved`);
    res.json(stats);
}));

// --- Docker Actions ---
app.post('/api/containers/:id/start', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Starting container ${req.params.id} on host ${hostId || 'local'}`);
    await dockerApiService.startContainer(req.params.id, hostId);
    log.info(`Container ${req.params.id} started successfully`);
    res.status(204).send();
}));

app.post('/api/containers/:id/stop', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Stopping container ${req.params.id} on host ${hostId || 'local'}`);
    await dockerApiService.stopContainer(req.params.id, hostId);
    log.info(`Container ${req.params.id} stopped successfully`);
    res.status(204).send();
}));

app.post('/api/containers/:id/restart', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Restarting container ${req.params.id} on host ${hostId || 'local'}`);
    await dockerApiService.restartContainer(req.params.id, hostId);
    log.info(`Container ${req.params.id} restarted successfully`);
    res.status(204).send();
}));

app.delete('/api/containers/:id', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Removing container ${req.params.id} on host ${hostId || 'local'}`);
    await dockerApiService.removeContainer(req.params.id, hostId);
    log.info(`Container ${req.params.id} removed successfully`);
    res.status(204).send();
}));

app.delete('/api/images/:id', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Removing image ${req.params.id} on host ${hostId || 'local'}`);
    await dockerApiService.removeImage(req.params.id, hostId);
    log.info(`Image ${req.params.id} removed successfully`);
    res.status(204).send();
}));

app.delete('/api/volumes/:name', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Removing volume ${req.params.name} on host ${hostId || 'local'}`);
    await dockerApiService.removeVolume(req.params.name, hostId);
    log.info(`Volume ${req.params.name} removed successfully`);
    res.status(204).send();
}));

app.post('/api/images/pull', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Pulling image ${req.body.name} on host ${hostId || 'local'}`);
    await dockerApiService.pullImage(req.body.name, hostId);
    log.info(`Image ${req.body.name} pulled successfully`);
    res.status(204).send();
}));

app.post('/api/networks', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Creating network ${req.body.name} with driver ${req.body.driver} on host ${hostId || 'local'}`);
    await dockerApiService.createNetwork(req.body.name, req.body.driver, hostId);
    log.info(`Network ${req.body.name} created successfully`);
    res.status(204).send();
}));

app.post('/api/system/prune', authenticateToken, asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    log.info(`Starting system prune operation on host ${hostId || 'local'}`, req.body);
    const report = await dockerApiService.pruneSystem(req.body, hostId);
    log.info('System prune completed', report);
    res.json(report);
}));

app.post('/api/containers/:id/exec', authenticateToken, asyncHandler(async (req, res) => {
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

app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});

// --- Error Handling ---
// The error handler must be registered before any other error middleware and after all controllers
Sentry.setupExpressErrorHandler(app);

// Optional fallthrough error handler
app.use(function onError(err: Error, req: express.Request, res: express.Response, next: express.NextFunction) {
    // The error id is attached to `res.sentry` to be returned
    // and optionally displayed to the user for support.
    res.statusCode = 500;
    res.end((res as any).sentry + "\n");
});

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


const httpServer = http.createServer(app);

// WebSocket server for interactive exec/attach
const wss = new WebSocketServer({ noServer: true });

httpServer.on('upgrade', (request, socket, head) => {
    // Allow only our exec path
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname === '/api/ws/exec') {
        wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
            wss.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});

wss.on('connection', async (ws: WebSocket, request: http.IncomingMessage) => {
    // Parse query params
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const token = url.searchParams.get('token');
    const containerId = url.searchParams.get('containerId');
    const hostId = url.searchParams.get('hostId');

    // Validate token
    try {
        if (!token) {
            ws.close();
            return;
        }
        const user = jwt.verify(token, JWT_SECRET);
        (request as any).user = user;
    } catch (err) {
        ws.close();
        return;
    }

    if (!containerId) {
        ws.close();
        return;
    }

    try {
        await dockerApiService.attachToContainer(ws, containerId, hostId || undefined);
    } catch (error) {
        console.error('Failed to attach to container via websocket', error);
        try { ws.close(); } catch (e) { /* noop */ }
    }
});

httpServer.listen(port, '0.0.0.0', async () => {
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
