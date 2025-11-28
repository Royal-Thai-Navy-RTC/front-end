# Build stage
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Vite reads env at build time
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Build static assets
RUN npm run build

# Production stage - serve with Nginx
FROM nginx:1.27-alpine AS runtime
WORKDIR /usr/share/nginx/html

# Remove default static files
RUN rm -rf ./*

# Copy built app
COPY --from=build /app/dist .

# Custom Nginx config (SPA fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
