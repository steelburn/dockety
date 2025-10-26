# [Choice] Node.js version: 20, 18, 16
ARG VARIANT=20-bullseye
FROM mcr.microsoft.com/devcontainers/javascript-node:1-${VARIANT}

# Install Docker CLI
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    docker.io \
    docker-compose-plugin \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Add the current user to the docker group
RUN usermod -aG docker node

# Set the default shell
ENV SHELL /bin/bash