## Dockety — AI Coding Agent Instructions

This file contains concise, repo-specific guidance to help AI agents be productive quickly in this Docker monitoring dashboard codebase.

### 1) Architecture Overview (what runs where)
- **Frontend**: React 19 + Vite app with TypeScript. Root `package.json` has scripts: `dev`, `build`, `preview`. Production served by Nginx container on port 8090. UI components in `components/` call backend via `services/dockerService.ts`.
- **Backend**: Express 4/5 server in `backend/src/` (entry: `server.ts`) using `dockerode` to communicate with Docker daemons via socket or TCP/HTTP. Uses `better-sqlite3` for local DB (`./data/dockety.db`). Core modules: `backend/src/dockerApi.ts` and `backend/src/database.ts`.
- **Multi-Host Support**: Backend supports multiple Docker hosts simultaneously - local via Unix socket and remote via TCP/HTTP with TLS and socket proxy options.
- **Deployment**: Multi-stage Dockerfiles + `docker-compose.yml` define production stack. `run.sh` is the universal build/run script that detects Docker availability and falls back to local development flows.

### 2) Key Behavioral Patterns
- **API Contract**: All REST endpoints in `backend/src/server.ts` accept `hostId` query parameters (e.g., `/api/containers?hostId=X`, `/api/images?hostId=X`, `/api/containers/:id/start?hostId=X`). Returns JSON `{error: string}` on failures, 204 for successful actions.
- **Multi-Host Docker**: Backend maintains Docker client instances per host ID, cached in Map. Local hosts use Unix socket, remote hosts use TCP/HTTP with configurable TLS and proxy settings.
- **Docker Integration**: `backend/src/dockerApi.ts` uses `dockerode` with per-host client instances. All Docker operations are async with proper error handling.
- **Frontend API Layer**: `services/dockerService.ts` centralizes all backend calls with `handleResponse()` helper. All methods accept `hostId` parameter for multi-host support. Special cases: `getContainerLogs` returns text, `removeImage` ensures `sha256:` prefix, `execCommand` executes shell commands in containers.
- **Database Layer**: `backend/src/database.ts` manages hosts table with SQLite. Prevents removing last host (see `removeHost` protection). Host configurations include type (local/remote), connection details, and status.
- **Compose Files**: UI supports editing via `components/ComposeFileEditor.tsx`, but `dockerService.updateComposeFile()` is intentionally a no-op for security.
- **Real-time Features**: Container stats provide live CPU/memory usage, exec allows interactive command execution in containers.

### 3) Development Workflows
**Docker (Recommended)**: `chmod +x run.sh && ./run.sh` → builds and runs full stack. Stop with `docker-compose down` (add `-v` to clear database).

**Local Development**:
- Frontend: `npm install && npm run dev` (Vite dev server)
- Backend: `cd backend && npm install && npm run dev` (ts-node-dev on port 3001)
- Production build: Frontend builds to `dist/`, backend compiles to `dist/server.js`

**Multi-Host Testing**:
- Add remote hosts via UI: System view → Add Host → configure TCP/HTTP connection
- Test connections: Use "Test Connection" button in host management
- Switch hosts: Use dropdown in header to switch between configured Docker daemons

### 4) Project-Specific Conventions
- **Monorepo Structure**: Two separate `package.json` files - root for frontend (Vite/React), `backend/` for server (Express/TypeScript). Each has independent dependencies.
- **Docker Socket Dependency**: Backend requires `/var/run/docker.sock` mount for local connections. For local testing without Docker, mock `dockerode` usage in `backend/src/dockerApi.ts`.
- **Multi-stage Dockerfiles**: Both `Dockerfile` (frontend) and `backend/Dockerfile` use Node 20 with proper production builds. Frontend uses nginx:stable-alpine for serving.
- **Nginx Proxy**: `nginx.conf` proxies `/api/*` to `backend:3001` and serves SPA with fallback routing.
- **Multi-Host Architecture**: Backend caches Docker client instances per host ID. Remote hosts support TCP/HTTP with TLS and socket proxy options.
- **Error Handling**: Backend may throw `(err as any).statusCode`. Frontend `handleResponse()` expects JSON `{error: string}` format.

### 5) Common Integration Points
- **Container Actions**: POST to `/api/containers/:id/{start,stop,restart}?hostId=X` returns 204. DELETE `/api/containers/:id?hostId=X` removes container.
- **Container Stats**: GET `/api/containers/:id/stats?hostId=X` returns real-time CPU, memory, and I/O statistics.
- **Container Exec**: POST `/api/containers/:id/exec?hostId=X` with `{command: string[]}` executes commands in running containers.
- **Image Management**: GET `/api/images?hostId=X` lists all, POST `/api/images/pull?hostId=X` with `{image: string}` pulls new images. GET `/api/images/:id/{inspect,history}?hostId=X` provides detailed image information.
- **System Operations**: POST `/api/system/prune?hostId=X` with `{volumes: boolean}` cleans up Docker resources.
- **Log Streaming**: GET `/api/containers/:id/logs?hostId=X` returns plain text (not JSON).

### 6) Critical Files for Changes
**Backend Logic**: `backend/src/{server.ts,dockerApi.ts,database.ts}`, **Frontend API**: `services/dockerService.ts`, **UI Components**: `components/{ComposeFileEditor,ComposeView,ContainersView,ConsoleTerminal}.tsx`, **Build/Deploy**: `run.sh`, `docker-compose.yml`, both Dockerfiles, `nginx.conf`

### 7) Quick Reference Examples
```typescript
// Frontend API call pattern
const containers = await dockerService.getContainers(hostId);

// Execute command in container
const result = await dockerService.execCommand(hostId, containerId, ['ls', '-la']);
console.log(result.output);

// Backend route example  
app.post('/api/containers/:id/start', asyncHandler(async (req, res) => {
    const hostId = req.query.hostId as string;
    await dockerApiService.startContainer(req.params.id, hostId);
    res.status(204).send();
}));
``` 
