# ===========================================
# Doctify Frontend Dockerfile (Production)
# ===========================================
# Multi-stage build for optimized React application

# ===========================================
# Stage 1: Builder
# ===========================================
FROM node:22-alpine AS builder

LABEL maintainer="Kah Wei Loo <noreply@kahweiloo.com>"
LABEL description="Doctify Frontend - React TypeScript Application"

# Set working directory
WORKDIR /build

# Copy package files
COPY package*.json ./

# Install dependencies
# Use ci for reproducible builds
RUN npm ci

# Copy application source
COPY . .

# Build application
# This will create optimized production build in /build/dist
RUN npm run build

# ===========================================
# Stage 2: Production (Nginx)
# ===========================================
FROM nginx:1.27-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Remove default Nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy built application from builder stage
COPY --from=builder /build/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nginx-user -u 1001 -G nodejs

# Set proper permissions
RUN chown -R nginx-user:nodejs /usr/share/nginx/html && \
    chown -R nginx-user:nodejs /var/cache/nginx && \
    chown -R nginx-user:nodejs /var/log/nginx && \
    chown -R nginx-user:nodejs /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx-user:nodejs /var/run/nginx.pid

# Switch to non-root user
USER nginx-user

# Expose port 80
EXPOSE 80

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
