# Backend Dockerfile — build TypeScript backend and produce a small runtime image
FROM node:20-bullseye AS builder
WORKDIR /app

# Install build tools for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y python3 build-essential --no-install-recommends && rm -rf /var/lib/apt/lists/*

COPY backend/package.json backend/package-lock.json* ./
COPY backend/tsconfig.json ./tsconfig.json
COPY backend/src ./src

RUN npm ci
RUN npm run build

# Production image (slim) — copy compiled app and node_modules from builder
FROM node:20-bullseye-slim
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY backend/package.json ./

EXPOSE 3000
CMD ["node", "dist/server.js"]
