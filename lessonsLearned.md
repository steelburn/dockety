# Lessons Learned - Dockety Development Issues & Fixes

This file tracks development issues encountered and their solutions for future reference.

## Issue: Frontend API calls failing with 404 errors to port 8090

**Date:** November 4, 2025  
**Symptoms:**
- Frontend console errors: "browser is not defined"
- API calls failing with 404 to `localhost:8090`
- JSON parsing errors in browser

**Root Cause:**
- Frontend was trying to access production port (8090) instead of development ports
- Vite proxy was misconfigured to wrong target
- Port conflicts between frontend (3002) and backend (3001)

**Solution:**
1. Fixed Vite proxy target from `localhost:3002` to `localhost:3001`
2. Separated ports: frontend on 3002, backend on 3001
3. Added `host: '0.0.0.0'` to backend server for proper binding
4. Ensured port parsing with `parseInt()` for type safety

**Files Changed:**
- `vite.config.ts`: Updated proxy target and port configuration
- `backend/src/server.ts`: Changed port to 3001, added host binding

**Prevention:** Always verify port configurations match between frontend and backend in development setup.

## Issue: Backend connectivity issues despite successful startup

**Date:** November 4, 2025  
**Symptoms:**
- Backend logs show "listening on port 3001"
- `curl` requests to API endpoints return "connection refused"
- Frontend unable to communicate with backend

**Root Cause:**
- Backend server was not binding to all interfaces (`0.0.0.0`)
- Only listening on localhost, not accessible from external connections

**Solution:**
- Added `host: '0.0.0.0'` parameter to `app.listen()` in backend server
- Ensured server binds to all network interfaces

**Files Changed:**
- `backend/src/server.ts`: Updated `app.listen(port, '0.0.0.0', callback)`

**Prevention:** Always bind development servers to `0.0.0.0` for external accessibility.

## Issue: Complex proxy configuration causing maintenance overhead

**Date:** November 4, 2025  
**Symptoms:**
- Vite proxy configuration required for development
- Additional complexity in development setup
- Potential for proxy-related bugs

**Root Cause:**
- Unnecessary proxy layer between frontend and backend
- CORS handled by backend, proxy not required

**Solution:**
1. Removed Vite proxy configuration entirely
2. Changed `API_BASE` from `/api` to `http://localhost:3001/api`
3. Direct HTTP calls from frontend to backend
4. Backend CORS configuration handles cross-origin requests

**Files Changed:**
- `vite.config.ts`: Removed proxy configuration
- `services/dockerService.ts`: Updated API_BASE to direct URL

**Benefits:**
- Simplified development setup
- Fewer moving parts
- Direct API communication
- Easier debugging

**Prevention:** Evaluate if proxy is truly necessary before implementing. Direct calls work fine with CORS.

## General Development Setup Notes

**Current Configuration (Simplified):**
- Frontend: `http://localhost:3002` (Vite dev server)
- Backend: `http://localhost:3001` (Express server)
- API calls: Configurable via `VITE_API_BASE` env var
  - Development: `http://localhost:3001/api`
  - Production: `/api` (nginx proxy)
- CORS enabled on backend
- Docker dev: Backend exposed on port 3001, Frontend on port 8090 with nginx proxy
- Tailwind CSS: Loaded via CDN (intentional design choice)

**Testing API Connectivity:**
```bash
# Test backend is running
curl -s http://localhost:3001/api/auth/is-first-user

# Should return: {"isFirstUser":true}
```

**Quick Debug Checklist:**
1. Check if backend is running: `ps aux | grep ts-node-dev`
2. Verify ports: Frontend on 3002, Backend on 3001
3. Test API endpoint directly with curl
4. Check browser network tab for failed requests
5. Verify no port conflicts

## Issue: Docker configuration not updated after port changes

**Date:** November 4, 2025  
**Symptoms:**
- Docker containers using outdated port configurations
- nginx proxy pointing to wrong backend port
- Backend not accessible from host in development

**Root Cause:**
- nginx.conf still pointing to backend:3002 instead of 3001
- docker-compose.dev.yml not exposing backend port for direct access
- Docker configurations not updated after simplifying the setup

**Solution:**
1. Updated nginx.conf proxy_pass to use port 3001
2. Added port mapping in docker-compose.dev.yml to expose backend on host port 3001
3. Ensured consistency between local development and containerized setups

**Files Changed:**
- `nginx.conf`: Updated proxy_pass target from `backend:3002` to `backend:3001`
- `docker-compose.dev.yml`: Added `ports: - "3001:3001"` for backend service

**Prevention:** Always update Docker configurations when changing port assignments or network setups.

## Issue: Production deployment API connection failures

**Date:** November 4, 2025  
**Symptoms:**
- Frontend deployed to production tries to connect to `http://localhost:3001`
- API calls fail with `ERR_CONNECTION_REFUSED` in production
- Login attempts fail because backend is not accessible

**Root Cause:**
- `API_BASE` in `services/dockerService.ts` was hardcoded to `http://localhost:3001/api`
- No environment variable configuration for different deployment environments
- Frontend assumes backend is always on localhost:3001

**Solution:**
1. Made `API_BASE` configurable via `VITE_API_BASE` environment variable
2. Added Vite environment types (`vite-env.d.ts`) for TypeScript support
3. Set default to `/api` for production (nginx proxy), `http://localhost:3001/api` for development
4. Updated Vite config to inject environment variables

**Files Changed:**
- `services/dockerService.ts`: Changed to `import.meta.env.VITE_API_BASE || 'http://localhost:3001/api'`
- `vite.config.ts`: Added `VITE_API_BASE` environment variable definition
- `vite-env.d.ts`: Added TypeScript types for Vite environment variables

**Prevention:** Always use environment variables for API endpoints instead of hardcoded URLs. Test deployments in staging environments before production.

## Issue: Tailwind CSS CDN usage in production

**Date:** November 4, 2025  
**Symptoms:**
- Console warning: `cdn.tailwindcss.com should not be used in production`
- Tailwind CSS loaded from external CDN instead of bundled

**Root Cause:**
- Initial setup used Tailwind CDN for simplicity
- Production deployments prefer bundled CSS for performance and reliability

**Decision:**
- Keep Tailwind CSS CDN approach as requested
- Document this as intentional design choice
- Accept console warning as acceptable trade-off for simplicity

**Prevention:** Document styling approach decisions clearly. CDN vs bundling is a conscious choice based on project needs.