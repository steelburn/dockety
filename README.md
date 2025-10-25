# Dockety - A Docker Monitoring Dashboard

Dockety is a clean, modern, and responsive dashboard for monitoring and managing your Docker environment. It connects directly to your Docker daemon to provide live data and management capabilities.

## ✨ Features

- **Live Docker Data**: Connects to your local Docker daemon for real-time information.
- **Persistent Configuration**: Host configurations are saved in a persistent SQLite database.
- **At-a-Glance Dashboard**: Get a quick overview of running containers, total images, volumes, and system information.
- **Container Management**: List all containers with their status, ports, and images. Perform actions like start, stop, restart, and remove.
- **Container Inspection**: View real-time container logs with streaming and access a (mock) terminal.
- **Image Management**: View all images, identify unused ones, see which containers use them, and pull new images from a repository.
- **Volume & Network Management**: List all volumes and networks, see their connections, and create/remove them.
- **Compose View**: Group containers by their Docker Compose project for easy application management.
- **System Maintenance**: Clean up your system by pruning unused containers, images, and volumes.
- **Light & Dark Themes**: Switch between themes to suit your preference.
- **Sort & Filter**: All tables are fully sortable and filterable for easy navigation.

## 🚀 Getting Started

Dockety is architected as a multi-container application and is deployed using Docker Compose.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/) (usually included with Docker Desktop)

### Installation

1.  **Clone the repository (or download the files):**
    ```bash
    git clone https://your-repo-url/dockety.git
    cd dockety
    ```

2.  **Use the run script:**
    A convenient `run.sh` script is provided to build and start the entire application stack.

    ```bash
    chmod +x run.sh
    ./run.sh
    ```
    This script will use `docker-compose` to:
    - Build the `frontend` and `backend` Docker images.
    - Create a persistent volume for the SQLite database.
    - Start both containers. The backend connects to your host's Docker socket to manage Docker.

3.  **Access Dockety:**
    Open your web browser and navigate to `http://localhost:8080`.

## 🐳 Architecture

Dockety runs as two services:
- **`frontend`**: A lightweight Nginx container that serves the static React application.
- **`backend`**: A Node.js server using Express.js. It connects to the Docker daemon via a mounted socket (`/var/run/docker.sock`) and uses a SQLite database for storing host configurations.

All API requests from the frontend are proxied through the Nginx server to the backend, ensuring seamless communication without CORS issues.

### Stopping the Application
To stop both the frontend and backend containers, run:
```bash
docker-compose down
```
This will stop the containers but will preserve your SQLite database in the `data` volume. To remove the database volume as well, use `docker-compose down -v`.