# Frontend Dockerfile — build Vite app and serve with nginx
FROM node:20-bullseye AS build
WORKDIR /app

# Install dependencies and build
COPY package.json package-lock.json* ./
COPY index.html ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY App.tsx index.tsx ./
# copy source tree (excluding backend via .dockerignore if present)
COPY components ./components
COPY hooks ./hooks
COPY services ./services
COPY public ./public
COPY src ./src
COPY types.ts ./

RUN npm ci --omit=dev || npm install
RUN npm run build

## Production image
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Use project nginx.conf if present
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
