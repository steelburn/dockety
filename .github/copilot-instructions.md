## Dockety — Quick instructions for AI coding agents

This file contains concise, repo-specific guidance so an AI helper can be productive quickly.

1) Big picture (what runs where)
- Frontend: a React + Vite app (root `package.json` scripts: `dev`, `build`, `preview`) served in production by an Nginx container. Frontend UI code lives in `components/` and uses `services/dockerService.ts` to call the backend API.
- Backend: an Express server in `backend/src/` (entry: `server.ts`) that uses `dockerode` to talk to the Docker daemon via `/var/run/docker.sock` and `better-sqlite3` for a small local DB (`./data/dockety.db`). Key backend modules: `backend/src/dockerApi.ts` and `backend/src/database.ts`.
- Deployment: `run.sh` and `docker-compose.yml` (see `README.md`) are the primary developer workflows for building and running the full stack in containers. `run.sh` will prefer Docker when available.

2) Where to look for concrete behavior
- API routes and semantics: `backend/src/server.ts` — all REST endpoints are declared here (e.g. `/api/containers`, `/api/images`, `/api/containers/:id/start`). Use this file to see request/response shapes and error handling.
- Docker interaction: `backend/src/dockerApi.ts` — contains the logic using `dockerode` (examples: `getContainers`, `getImages`, `pullImage`, `pruneSystem`). Note: the code expects the Docker socket to be mounted into the container or reachable on the host.
- Persistence & host management: `backend/src/database.ts` — uses `better-sqlite3`. It initializes `hosts` and prevents removing the last host (see `removeHost`).
- Frontend API usage: `services/dockerService.ts` — canonical fetch wrapper and helpers (e.g., `getContainerLogs` uses text responses; `removeImage` has logic to ensure `sha256:` prefix). Match fetch behavior here when adding features.
- Compose UI: `components/ComposeFileEditor.tsx` — the UI allows editing the compose YAML, but the live backend does not persist compose updates (`dockerService.updateComposeFile` is intentionally a no-op).

3) Build / run / debug (concrete commands)
- Quick, recommended: run the whole stack in Docker (preferred to get accurate Docker behavior):
  - Make script executable and run it: `chmod +x run.sh && ./run.sh` — `run.sh` auto-detects Docker and builds the root image (and uses `docker-compose.yml`).
  - Stop: `docker-compose down` (add `-v` to remove the sqlite volume).
- Local frontend development (fast iteration):
  - From repo root: `npm install` then `npm run dev` (Vite). The dev server runs on Vite's default port; the production image maps to `http://localhost:8080` when using compose as in README.
- Local backend development (edit-and-reload):
  - `cd backend && npm install && npm run dev` (uses `ts-node-dev` and runs `src/server.ts`). The backend binds to port 3000 in `server.ts`.

4) Project-specific conventions & gotchas
- Monorepo-ish layout: frontend and backend both have package.json files. Root-level `package.json` contains the Vite/react scripts; backend has its own scripts and dev deps.
- Docker socket assumption: backend code uses Docker socket path (`/var/run/docker.sock`) — when testing locally without Docker or in CI, mock or adjust `dockerode` usage.
- Empty/placeholder Dockerfiles and nginx.conf: there are `Dockerfile` and `backend/Dockerfile` (and `nginx.conf`) present but currently empty. The `run.sh` logic still looks for a root `Dockerfile` and will try to build if present. Confirm Dockerfiles before relying on them.
- Compose editing: UI allows editing compose file content, but the backend returns a placeholder string and does not persist edits. See `dockerApi.getComposeProjects()` and `dockerService.updateComposeFile()`.
- Error shape: backend errors may include `(err as any).statusCode`. Frontend expects JSON `{ error: string }` payloads on failures (see `services/dockerService.ts` handleResponse).

5) Where to add tests or safety checks (low-risk places to start)
- Add small unit tests around `backend/src/database.ts` (host add/remove/update behaviors).
- Add integration tests that mock `dockerode` for `backend/src/dockerApi.ts` to validate mapping (e.g., container -> UI container shape).

6) Quick examples to copy/paste
- Call an API endpoint from frontend style:
  fetch('/api/containers').then(res => res.json())
- Start container (backend route): POST `/api/containers/:id/start` returns 204 on success.

7) Files to always check when changing behavior
- `backend/src/server.ts`, `backend/src/dockerApi.ts`, `backend/src/database.ts`
- `services/dockerService.ts`, `components/ComposeFileEditor.tsx`, `components/ComposeView.tsx`
- `run.sh`, `docker-compose.yml`, `Dockerfile`, `backend/Dockerfile`, `nginx.conf`

If anything in this summary is unclear or you want me to expand any section (more API shapes, example requests/responses, or suggested tests), tell me which area to expand and I'll iterate. 
