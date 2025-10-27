## Dockety — Copilot / AI Agent Instructions (concise)

Purpose: quick, actionable guidance so an AI coding agent can be productive in this repo.

Key architecture
- Frontend: React + Vite (root `package.json`). Served in prod by Nginx on port 8090. UI layer lives in `components/` and calls the backend via `services/dockerService.ts`.
- Backend: Express server in `backend/src/` (entry `server.ts`) using `dockerode` to interact with Docker and `better-sqlite3` for persistent host config at `./data/dockety.db`.
- Multi-host model: backend keeps per-host Docker client instances (cache in `backend/src/dockerApi.ts`). Hosts are stored in SQLite and include `socketProxy` and TLS flags.

How to run
- Recommended (Docker): make `run.sh` executable and run it. It prefers Docker if available and will build/run the app with docker-compose. Useful flags: `--no-cache`, `--no-docker` (force local flow), `--image NAME`.
- Local dev: (frontend) `npm install && npm run dev` at repo root (runs on port 3001); (backend) `cd backend && npm install && npm run dev` (runs on port 3002 with frontend proxy configured).

Important conventions & gotchas
- All frontend → backend API calls use an optional `hostId` query param. When absent the default host id is `local-docker` (see `backend/src/database.ts`).
- `services/dockerService.ts` centralizes HTTP calls and uses `handleResponse()`; 204 responses map to undefined. `getContainerLogs` returns plain text (not JSON). `removeImage` prepends `sha256:` when needed.
- The backend prevents deleting the last host (see `databaseService.removeHost`) — treat host removal carefully in automation.
- Editing Compose files from the UI is intentionally a no-op; the backend does not modify running compose files (`updateComposeFile()` is a no-op).
- When running containerized, backend needs access to `/var/run/docker.sock` for local Docker host operations. Remote hosts are supported via TCP (with optional TLS) or via a socket proxy.
- Network Map uses React Flow for visualization: nodes are draggable, orphaned resources appear on the right side, layout prevents overlaps.

Key files to inspect/edit
- Backend entry & routes: `backend/src/server.ts`
- Docker client + multi-host logic: `backend/src/dockerApi.ts`
- Host DB & migrations: `backend/src/database.ts` (data path `./data/dockety.db`, default host id `local-docker`)
- Frontend API layer: `services/dockerService.ts` (shows expected endpoints and error format)
- Network Map visualization: `components/NetworkMapView.tsx` (React Flow implementation with draggable nodes, intelligent layout)
- Run/build helper: `run.sh` and `docker-compose.yml`

Common API examples (useful snippets)
- List containers: GET `/api/containers?hostId=<id>` (returns JSON array)
- Run command in container: POST `/api/containers/:id/exec?hostId=<id>` with body `{ "command": ["ls","-la"] }` → returns `{ output }`.
- Pull image: POST `/api/images/pull?hostId=<id>` body `{ "name": "nginx:latest" }` → 204 on success.

Quick checks for agents
- To add a host: POST `/api/hosts` with `{name,type,host,port,tls,socketProxy}` then call `/hosts/:id/test` to verify.
- To debug connection issues, examine backend logs (the server logs requests and errors) and check `dockerApi.testHostConnection` logic.

If you want additions, tell me which workflows or files you'd like expanded (e.g., CI, tests, or docker-compose overrides) and I will add them.
