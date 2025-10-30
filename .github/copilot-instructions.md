## Dockety — Copilot / AI Agent Instructions (concise)

Purpose: quick, actionable guidance so an AI coding agent can be productive in this repo.

### Key Architecture
- **Frontend**: React + Vite (root `package.json`). Served in prod by Nginx on port 8090. UI layer lives in `components/` and calls backend via `services/dockerService.ts`.
- **Backend**: Express server in `backend/src/` (entry `server.ts`) using `dockerode` to interact with Docker and `better-sqlite3` for persistent host config at `./data/dockety.db`.
- **Multi-host model**: Backend keeps per-host Docker client instances (cache in `backend/src/dockerApi.ts`). Hosts stored in SQLite include `socketProxy` and TLS flags.
- **Authentication**: JWT-based with roles (owner/admin/user). First user becomes owner automatically. Non-first users need approval.

### How to Run
- **Recommended (Docker)**: `chmod +x run.sh && ./run.sh` — prefers Docker if available, builds/runs with docker-compose. Flags: `--no-cache`, `--no-docker` (force local), `--image NAME`.
- **Local dev**: Frontend `npm run dev` (port 5173); Backend `cd backend && npm run dev` (port 3001). Full stack: `npm start` (concurrently runs both).
- **Production**: `docker-compose up -d` (pulls from GHCR) or `docker-compose -f docker-compose.dev.yml up -d` (builds locally).

### Important Conventions & Gotchas
- **API calls**: All frontend → backend API calls use optional `hostId` query param. When absent, defaults to `local-docker` (see `backend/src/database.ts`).
- **Response handling**: `services/dockerService.ts` centralizes HTTP calls and uses `handleResponse()`; 204 responses map to `undefined`. `getContainerLogs` returns plain text (not JSON).
- **Image operations**: `removeImage` prepends `sha256:` when needed for full image IDs.
- **Host management**: Backend prevents deleting the last host (see `databaseService.removeHost`) — treat host removal carefully in automation.
- **Compose files**: Editing Compose files from UI is intentionally a no-op; backend does not modify running compose files (`updateComposeFile()` is a no-op).
- **Database migrations**: SQLite schema uses `ALTER TABLE` with try/catch for backward compatibility (columns may already exist).
- **Docker connections**: When running containerized, backend needs `/var/run/docker.sock` access. Remote hosts via TCP (with optional TLS) or socket proxy.

### Key Files to Inspect/Edit
- **Backend entry & routes**: `backend/src/server.ts`
- **Docker client + multi-host logic**: `backend/src/dockerApi.ts` (caches Docker instances by host ID)
- **Host DB & migrations**: `backend/src/database.ts` (data path `./data/dockety.db`, default host id `local-docker`)
- **Frontend API layer**: `services/dockerService.ts` (shows expected endpoints and error format)
- **Run/build helper**: `run.sh` and `docker-compose.yml`
- **Types**: `types.ts` (Host, Container, etc. interfaces)

### Common API Patterns (useful snippets)
- **List containers**: `GET /api/containers?hostId=<id>` → JSON array
- **Run command in container**: `POST /api/containers/:id/exec?hostId=<id>` body `{ "command": ["ls","-la"] }` → `{ output }`
- **Pull image**: `POST /api/images/pull?hostId=<id>` body `{ "name": "nginx:latest" }` → 204 on success
- **Add host**: `POST /api/hosts` body `{name,type,host,port,tls,socketProxy,apiKey}` then `GET /hosts/:id/test` to verify
- **Debug connections**: Check backend logs (server logs requests/errors) and `dockerApi.testHostConnection` logic

### Development Workflow Tips
- **Testing connections**: Use `dockerApi.testHostConnection(host)` to verify Docker host connectivity before operations
- **Error handling**: Backend uses consistent logging utility (`log.info/debug/warn/error`) with ISO timestamps
- **State management**: Frontend uses React state for hosts, selectedHost, currentView, theme, auth status
- **Component patterns**: Views follow consistent structure with host selection, data fetching, and action handlers

If you want additions, tell me which workflows or files you'd like expanded (e.g., CI, tests, or docker-compose overrides) and I will add them.
