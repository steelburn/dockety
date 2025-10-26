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

    #### Option A: Build Locally (Recommended for Development)
    ```bash
    chmod +x run.sh
    ./run.sh
    ```
    This script will use `docker-compose` to build and start the entire application stack locally.

    #### Option B: Pull Pre-built Images (Faster Deployment)
    ```bash
    # Edit docker-compose.yml and uncomment the image lines for both services
    # Then run:
    docker-compose up -d
    ```
    This will pull the latest images from GitHub Container Registry and start the application.

3.  **Access Dockety:**
    Open your web browser and navigate to `http://localhost:8090`.

## 🐳 Multi-Host Docker Support

Dockety supports connecting to multiple Docker hosts:

- **Local Docker**: Connects to your local Docker daemon via Unix socket
- **Remote Docker**: Connect to remote Docker daemons via TCP/HTTP (with optional TLS and socket proxy support)

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

The backend supports multiple Docker host connections simultaneously, allowing you to monitor and manage containers across different environments. All API requests from the frontend are proxied through the Nginx server to the backend, ensuring seamless communication without CORS issues.

### Host Management

The application maintains a persistent SQLite database of configured Docker hosts. Each host can be:
- **Local**: Uses the host's Docker socket (`/var/run/docker.sock`)
- **Remote**: Connects via TCP/HTTP to remote Docker daemons with configurable TLS and proxy settings

Docker client instances are cached per host for optimal performance and connection management.

### CI/CD Pipeline

Dockety includes a GitHub Actions CI pipeline that:
- Builds Docker images for both frontend and backend services
- Pushes images to GitHub Container Registry (ghcr.io) with both `:latest` and unique PR tags
- Provides automated testing and deployment capabilities

Images are available at:
- `ghcr.io/steelburn/dockety-frontend:latest`
- `ghcr.io/steelburn/dockety-backend:latest`

### Stopping the Application
To stop both the frontend and backend containers, run:
```bash
docker-compose down
```
This will stop the containers but will preserve your SQLite database in the `data` volume. To remove the database volume as well, use `docker-compose down -v`.