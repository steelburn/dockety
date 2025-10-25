import express from 'express';
import cors from 'cors';
import { databaseService } from './database';
import { dockerApiService } from './dockerApi';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Wrapper for async routes
const asyncHandler = (fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<any>) =>
    (req: express.Request, res: express.Response, next: express.NextFunction) =>
        Promise.resolve(fn(req, res, next)).catch(next);

// --- Host Management (Database) ---
app.get('/api/hosts', (req, res) => res.json(databaseService.getHosts()));
app.post('/api/hosts', (req, res) => res.status(201).json(databaseService.addHost(req.body.name)));
app.put('/api/hosts/:id', (req, res) => res.json(databaseService.updateHost(req.params.id, req.body.name)));
app.delete('/api/hosts/:id', (req, res) => {
    databaseService.removeHost(req.params.id);
    res.status(204).send();
});

// --- Docker Data ---
app.get('/api/system/info', asyncHandler(async (req, res) => res.json(await dockerApiService.getSystemInfo())));
app.get('/api/system/stats', asyncHandler(async (req, res) => res.json(await dockerApiService.getStats())));
app.get('/api/containers', asyncHandler(async (req, res) => res.json(await dockerApiService.getContainers())));
app.get('/api/images', asyncHandler(async (req, res) => res.json(await dockerApiService.getImages())));
app.get('/api/volumes', asyncHandler(async (req, res) => res.json(await dockerApiService.getVolumes())));
app.get('/api/networks', asyncHandler(async (req, res) => res.json(await dockerApiService.getNetworks())));
app.get('/api/compose', asyncHandler(async (req, res) => res.json(await dockerApiService.getComposeProjects())));
app.get('/api/containers/:id/logs', asyncHandler(async (req, res) => res.type('text/plain').send(await dockerApiService.getContainerLogs(req.params.id))));

// --- Docker Actions ---
app.post('/api/containers/:id/start', asyncHandler(async (req, res) => {
    await dockerApiService.startContainer(req.params.id);
    res.status(204).send();
}));
app.post('/api/containers/:id/stop', asyncHandler(async (req, res) => {
    await dockerApiService.stopContainer(req.params.id);
    res.status(204).send();
}));
app.post('/api/containers/:id/restart', asyncHandler(async (req, res) => {
    await dockerApiService.restartContainer(req.params.id);
    res.status(204).send();
}));
app.delete('/api/containers/:id', asyncHandler(async (req, res) => {
    await dockerApiService.removeContainer(req.params.id);
    res.status(204).send();
}));
app.delete('/api/images/:id', asyncHandler(async (req, res) => {
    await dockerApiService.removeImage(req.params.id);
    res.status(204).send();
}));
app.delete('/api/volumes/:name', asyncHandler(async (req, res) => {
    await dockerApiService.removeVolume(req.params.name);
    res.status(204).send();
}));
app.post('/api/images/pull', asyncHandler(async (req, res) => {
    await dockerApiService.pullImage(req.body.name);
    res.status(204).send();
}));
app.post('/api/networks', asyncHandler(async (req, res) => {
    await dockerApiService.createNetwork(req.body.name, req.body.driver);
    res.status(204).send();
}));
app.post('/api/system/prune', asyncHandler(async (req, res) => {
    const report = await dockerApiService.pruneSystem(req.body);
    res.json(report);
}));

// --- Error Handling ---
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    // Dockerode often includes the status code in the error object
    const statusCode = (err as any).statusCode || 500;
    res.status(statusCode).json({ error: err.message });
});


app.listen(port, () => {
    console.log(`Dockety backend listening on port ${port}`);
});
