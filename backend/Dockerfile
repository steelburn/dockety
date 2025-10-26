# Backend Dockerfile — build TypeScript backend and produce a small runtime image
FROM node:20-bullseye AS builder
WORKDIR /app

# Install build tools for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y python3 build-essential --no-install-recommends && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY tsconfig.json ./tsconfig.json
COPY src ./src

RUN npm install --production=false || npm install
RUN npm run build

# Production image (slim) — copy compiled app and node_modules from builder
FROM node:20-bullseye-slim
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
	CMD node -e "require('http').get('http://127.0.0.1:3001/health', res => { if (res.statusCode===200) process.exit(0); process.exit(1); }).on('error', () => process.exit(1))"

CMD ["node", "dist/server.js"]
