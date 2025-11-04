## Dockety — Copilot / AI Agent Instructions (concise)

Purpose: quick, actionable guidance so an AI coding agent can be productive in this repo.

Key architecture
- Frontend: React + Vite (root `package.json`). Served in prod by Nginx on port 8090. UI layer lives in `components/` and calls the backend via `services/dockerService.ts`.
- Backend: Express server in `backend/src/` (entry `server.ts`) using `dockerode` to interact with Docker and `better-sqlite3` for persistent host config at `./data/dockety.db`.
- Multi-host model: backend keeps per-host Docker client instances (cache in `backend/src/dockerApi.ts`). Hosts are stored in SQLite and include `socketProxy` and TLS flags.
- Authentication: JWT-based with bcrypt password hashing, role-based access control (owner/admin/user), SQLite user database.

How to run
- Recommended (Docker): make `run.sh` executable and run it. It prefers Docker if available and will build/run the app with docker-compose. Useful flags: `--no-cache`, `--no-docker` (force local flow), `--image NAME`.
- Local dev: (frontend) `npm install && npm run dev` at repo root (runs on port 3002); (backend) `cd backend && npm install && npm run dev` (runs on port 3001, no proxy needed).

Important conventions & gotchas
- **API Routing**: All backend routes are prefixed with `/api/` (e.g., `/api/auth/login`, `/api/containers`). Frontend API base URL is configurable via `VITE_API_BASE` env var (defaults to `/api` in production, `http://localhost:3001/api` in development).
- All frontend → backend API calls use an optional `hostId` query param. When absent the default host id is `local-docker` (see `backend/src/database.ts`).
- `services/dockerService.ts` centralizes HTTP calls and uses `handleResponse()`; 204 responses map to undefined. `getContainerLogs` returns plain text (not JSON). `removeImage` prepends `sha256:` when needed.
- The backend prevents deleting the last host (see `databaseService.removeHost`) — treat host removal carefully in automation.
- Editing Compose files from the UI is intentionally a no-op; the backend does not modify running compose files (`updateComposeFile()` is a no-op).
- When running containerized, backend needs access to `/var/run/docker.sock` for local Docker host operations. Remote hosts are supported via TCP (with optional TLS) or via a socket proxy.
- Network Map uses React Flow for visualization: nodes are draggable, orphaned resources appear on the right side, layout prevents overlaps.
- **Styling**: Uses Tailwind CSS loaded via CDN (not PostCSS build) - keep this approach for future development.
- **Database Schema**: User table uses `password_hash`, `is_approved`, `created_at` columns but TypeScript interfaces use `passwordHash`, `isApproved`, `createdAt` - database service handles mapping.

Key files to inspect/edit
- Backend entry & routes: `backend/src/server.ts` (all routes prefixed with `/api/`)
- Docker client + multi-host logic: `backend/src/dockerApi.ts`
- Host DB & migrations: `backend/src/database.ts` (data path `./data/dockety.db`, default host id `local-docker`)
- Frontend API layer: `services/dockerService.ts` (shows expected endpoints and error format)
- Network Map visualization: `components/NetworkMapView.tsx` (React Flow implementation with draggable nodes, intelligent layout)
- Authentication logic: `backend/src/server.ts` (JWT auth, bcrypt password comparison)
- Run/build helper: `run.sh` and `docker-compose.yml`

Common API examples (useful snippets)
- List containers: GET `/api/containers?hostId=<id>` (returns JSON array)
- Run command in container: POST `/api/containers/:id/exec?hostId=<id>` with body `{ "command": ["ls","-la"] }` → returns `{ output }`.
- Pull image: POST `/api/images/pull?hostId=<id>` body `{ "name": "nginx:latest" }` → 204 on success.
- Authenticate: POST `/api/auth/login` with `{ "username": "...", "password": "..." }` → returns `{ "token": "...", "user": {...} }`

Quick checks for agents
- To add a host: POST `/api/hosts` with `{name,type,host,port,tls,socketProxy}` then call `/api/hosts/:id/test` to verify.
- To debug connection issues, examine backend logs (the server logs requests and errors) and check `dockerApi.testHostConnection` logic.
- To debug auth issues, check that database field mapping is correct (`password_hash` ↔ `passwordHash`, etc.).
- First user registration automatically creates an owner account and approves it.

If you want additions, tell me which workflows or files you'd like expanded (e.g., CI, tests, or docker-compose overrides) and I will add them.

## Development Workflow & Branching Strategy

**Branching Strategy:**
- **Main Branch**: Production-ready code only. Never commit directly to main.
- **Feature Branches**: Create separate branches for all fixes and features (e.g., `fix/api-base-config`, `feature/new-dashboard`).
- **Testing**: Test all changes in production environment before merging to main.
- **Merging**: Only merge to main after confirming production deployment works correctly.

**API Configuration:**
- **Production**: Frontend uses `/api` (nginx proxies to backend:3001)
- **Development**: Frontend uses `http://localhost:3001/api` (direct backend connection)
- **No Environment Variables**: API_BASE is hardcoded in vite.config.ts based on build mode to prevent production misconfigurations

**Recent Critical Fix (RESOLVED):**
- **Issue**: Production frontend was connecting to full domain URLs instead of relative `/api` paths
- **Root Cause**: Environment variable overrides in production deployment
- **Solution**: Hardcoded API_BASE in vite.config.ts based on build mode
- **Prevention**: Always test production builds before merging to main
- **Status**: ✅ FIXED - Mode-based defaults prevent environment variable overrides

**Deployment Best Practices:**
- **Image Building**: AI agents can build Docker images locally for testing
- **Image Pushing**: Must be done manually by developers (requires authentication)
- **Environment Testing**: Test production builds locally before deployment
- **API_BASE Validation**: Verify API_BASE uses `/api` in production, not full URLs
- **Registry Updates**: Push updated images to GHCR after fixes before redeploying
