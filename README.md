# Dockety - A Docker Monitoring Dashboard

Dockety is a clean, modern, and responsive dashboard for monitoring and managing your Docker environment. It connects directly to your Docker daemon to provide live data and management capabilities, with support for both local and remote Docker hosts.

## ✨ Features

- **Multi-Host Docker Support**: Connect to multiple Docker daemons - local and remote hosts via TCP/HTTP
- **Live Docker Data**: Real-time information from connected Docker daemons
- **Persistent Configuration**: Host configurations are saved in a persistent SQLite database
- **At-a-Glance Dashboard**: Get a quick overview of running containers, total images, volumes, and system information
- **Container Management**: List all containers with their status, ports, and images. Perform actions like start, stop, restart, and remove
- **Container Inspection**: View real-time container logs with streaming and access a (mock) terminal
- **Image Management**: View all images, identify unused ones, see which containers use them, and pull new images from a repository
- **Volume & Network Management**: List all volumes and networks, see their connections, and create/remove them
- **Compose View**: Group containers by their Docker Compose project for easy application management
- **System Maintenance**: Clean up your system by pruning unused containers, images, and volumes
- **Light & Dark Themes**: Switch between themes to suit your preference
- **Sort & Filter**: All tables are fully sortable and filterable for easy navigation
- **CI/CD Ready**: Automated builds and deployments with GitHub Actions and Container Registry

## 🚀 Getting Started

Dockety is architected as a multi-container application and is deployed using Docker Compose.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/) (usually included with Docker Desktop)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/steelburn/dockety.git
    cd dockety
    ```

2.  **Choose your deployment method:**

    #### Option A: Build Locally (Development)
    ```bash
    docker-compose -f docker-compose.dev.yml up -d
    ```
    This builds the application from source code locally.

    #### Option B: Pull Pre-built Images (Production)
    ```bash
    docker-compose up -d
    ```
    This pulls the latest images from GitHub Container Registry and starts the application quickly.

3.  **Access Dockety:**
    Open your web browser and navigate to `http://localhost:8090`.

### Local Development Setup

For local development without Docker:

### Interactive Console
The interactive container console now uses xterm.js and a WebSocket-based interactive shell for much faster, real-time performance. When opening the console, the UI will establish a websocket connection to the backend and stream I/O to the container shell.

1. **Backend Setup:**
   ```bash
   cd backend
   npm install
   npm run dev  # Runs on port 3001
   ```

2. **Frontend Setup:**
   ```bash
   npm install
   npm run dev  # Runs on port 3002
   ```

3. **Environment Variables:**
   - Frontend automatically connects to `http://localhost:3001/api` in development
   - In production, set `VITE_API_BASE=/api` for nginx proxy routing

   ### Network Map Filters

   The Network Map visualization provides a small set of filters to help you narrow down the resources shown on the map:
   - **Resource Types**: Toggle display of Containers, Networks, Volumes, Images, and Compose Projects
   - **Search**: Filter resources by name
   - **Only Running**: Toggle to show only running containers
   - **Show Orphaned**: Include or hide orphaned resources that are not connected in the map

   Filters are persisted locally to make it easier to work with large environments.

   - **Keyboard Shortcut**: Toggle the filter panel with <kbd>Shift</kbd>+<kbd>F</kbd> (focuses search). Press <kbd>Esc</kbd> to close.

   #### Manual test
   1. Open the Network Map in the UI.
   2. Use the Filters button to open filter panel.
   3. Toggle resource types and use the search box to verify nodes are hidden/shown.
   4. Toggle 'Only Running' and 'Show Orphaned' to validate the behavior.

### Compact Legend

The Network Map includes a compact legend (top-right of the map, near the controls) that shows colored lines for edge types:
- **Network**: Blue
- **C→N** (Container → Network): Green
- **Volume**: Orange
- **Image**: Indigo
- **Compose**: Purple

This provides a compact, at-a-glance way to understand what different edge colors represent in the map.


### Multi-Host Docker Support

Dockety supports managing multiple Docker hosts from a single interface:
- **Local Docker**: Default host using local Docker socket (`/var/run/docker.sock`)
- **Remote Hosts**: TCP connections with optional TLS encryption
- **Socket Proxy**: Secure remote access via SSH tunneling
- **Host Management**: Add, test, and remove Docker hosts through the UI
- **Per-Host Operations**: All Docker operations (containers, images, networks, volumes) are host-specific

Configure additional hosts through the Hosts section in the web interface.

### Adding Remote Hosts

1. In the Dockety interface, go to the System view
2. Click "Add Host" to configure a new remote Docker connection
3. Enter the host details:
   - **Name**: A friendly name for the host
   - **Type**: Select "remote"
   - **Host**: IP address or hostname (e.g., `192.168.1.100`)
   - **Port**: Docker daemon port (default: 2376 for TLS, 2375 for non-TLS)
   - **TLS**: Enable for secure connections
   - **Socket Proxy**: Enable if using a socket proxy (like for Docker Desktop remote connections)

4. Test the connection and save the host
5. Switch between hosts using the dropdown in the header

### Supported Connection Types

- **Local Unix Socket**: `/var/run/docker.sock` (default)
- **TCP without TLS**: `tcp://host:2375`
- **TCP with TLS**: `tcp://host:2376`
- **HTTP Proxy**: Using Docker Socket Proxy (https://github.com/steelburn/docker-socket-proxy), which proxies Docker connections over HTTP.

## 🐳 Architecture

Dockety runs as two services:
- **`frontend`**: A lightweight Nginx container that serves the static React application on port 8090
- **`backend`**: A Node.js server using Express.js on port 3001. It connects to Docker daemons via mounted socket or TCP/HTTP and uses a SQLite database for storing host configurations

### Docker Compose Files

Dockety provides two Docker Compose configurations:

- **`docker-compose.yml`**: Production deployment using pre-built images from GitHub Container Registry
- **`docker-compose.dev.yml`**: Development deployment that builds images locally from source code

The backend supports multiple Docker host connections simultaneously, allowing you to monitor and manage containers across different environments. The frontend uses configurable API endpoints - in development it connects directly to the backend, while in production requests are proxied through Nginx.

### Host Management

The application maintains a persistent SQLite database of configured Docker hosts. Each host can be:
- **Local**: Uses the host's Docker socket (`/var/run/docker.sock`)
- **Remote**: Connects via TCP/HTTP to remote Docker daemons with configurable TLS and proxy settings

Docker client instances are cached per host for optimal performance and connection management.

### Error Monitoring

Dockety integrates Sentry for comprehensive error tracking and monitoring:
- **Frontend**: React error boundaries capture UI crashes and JavaScript errors
- **Backend**: Express middleware logs API failures and Docker operation errors
- **Production Ready**: Environment-based Sentry DSN configuration for different deployment stages

Configure Sentry by setting the `SENTRY_DSN` environment variable in your deployment environment.

### Styling

Dockety uses **Tailwind CSS via CDN** for styling:
- **No Build Step**: Tailwind is loaded directly from CDN, eliminating PostCSS compilation
- **Performance**: Faster builds and smaller bundle sizes
- **Simplicity**: No additional build configuration or dependencies required
- **Modern UI**: Clean, responsive design with utility-first CSS approach

This approach prioritizes development speed and deployment simplicity over advanced customization needs.

### CI/CD Pipeline

Dockety includes an optimized GitHub Actions CI pipeline that:
- **Smart Builds**: Only builds frontend/backend images when respective code changes
- **Path Filtering**: Uses git diff to detect which services need rebuilding
- **Parallel Jobs**: Separate build jobs for frontend and backend run concurrently when both change
- **Automated Publishing**: Pushes images to GitHub Container Registry with both `:latest` and unique PR tags

Images are available at:
- `ghcr.io/steelburn/dockety-frontend:latest`
- `ghcr.io/steelburn/dockety-backend:latest`

This optimization significantly reduces CI execution time and costs when only one service is modified.

### Stopping the Application
To stop the containers, run:
```bash
# For production deployment
docker-compose down

# For development deployment
docker-compose -f docker-compose.dev.yml down
```
This will stop the containers but will preserve your SQLite database in the `data` volume. To remove the database volume as well, use `docker-compose down -v`.

## Troubleshooting

### Common Issues

**API Connection Failed**
- **Production**: Ensure `VITE_API_BASE` environment variable is set correctly (defaults to `/api`)
- **Development**: Check that backend is running on port 3001 and frontend on port 3002
- **Docker**: Verify nginx proxy configuration and container networking

**Docker Host Connection Issues**
- **Local**: Ensure Docker daemon is running and accessible via `/var/run/docker.sock`
- **Remote**: Test connection using the host management interface
- **Permissions**: Backend container needs Docker socket access when using local host

**Build Issues**
- **Dependencies**: Run `npm install` in both root and `backend/` directories
- **Docker**: Ensure Docker daemon is running for containerized builds
- **CI/CD**: Check GitHub Actions logs for detailed error information

**Database Issues**
- **File Permissions**: Ensure write access to `./data/` directory for SQLite database
- **Migrations**: Database schema updates are handled automatically on startup
- **Backup**: Regularly backup `dockety.db` file for data persistence

### Getting Help

- Check the [Issues](https://github.com/steelburn/dockety/issues) page for known problems
- Review backend logs for detailed error information
- Test API endpoints directly using tools like curl or Postman

## Contributing

### Development Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/dockety.git`
3. Install dependencies: `npm install && cd backend && npm install`
4. Start development servers: `npm run dev` (frontend) and `cd backend && npm run dev` (backend)
5. Make your changes and test thoroughly
6. Submit a pull request with a clear description of your changes

### Code Style
- **Frontend**: TypeScript with React hooks, functional components preferred
- **Backend**: TypeScript with Express.js, RESTful API design
- **Database**: SQLite with migrations handled automatically
- **Docker**: Multi-stage builds, optimized for production

### Testing
- Test all Docker operations across different host configurations
- Verify both local development and production deployments
- Check API endpoints with various parameter combinations
- Validate UI responsiveness and error handling

### Commit Guidelines
- Use clear, descriptive commit messages
- Reference issue numbers when applicable
- Keep commits focused on single changes or features