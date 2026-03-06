# Stage 1: Build the UI
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies (utilizing cache)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Serve with NGINX
FROM nginx:alpine

# Copy custom NGINX configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output from Stage 1
COPY --from=build /app/dist /usr/share/nginx/html

# Copy the entrypoint script
COPY entrypoint.sh /docker-entrypoint.d/99-entrypoint.sh
RUN sh -c "sed -i 's/\\r$//' /docker-entrypoint.d/99-entrypoint.sh"
RUN chmod +x /docker-entrypoint.d/99-entrypoint.sh

# Expose port 80
EXPOSE 80

# The nginx:alpine image automatically runs scripts in /docker-entrypoint.d/
# before starting the nginx server.

