# ===========================================
# Doctify Backend Dockerfile (Production)
# ===========================================
# Multi-stage build for optimized image size and security

# ===========================================
# Stage 1: Builder
# ===========================================
FROM python:3.11-slim AS builder

LABEL maintainer="Kah Wei Loo <noreply@kahweiloo.com>"
LABEL description="Doctify Backend - AI-Powered Document Intelligence Platform"

# Set working directory
WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    python3-dev \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy requirements files
COPY requirements/base.txt requirements/prod.txt ./requirements/

# Install Python dependencies to user directory
RUN pip install --no-cache-dir --user --upgrade pip && \
    pip install --no-cache-dir --user -r requirements/prod.txt

# ===========================================
# Stage 2: Production
# ===========================================
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/home/appuser/.local/bin:$PATH" \
    ENVIRONMENT=production \
    PORT=8000

# Create application user (security best practice - run as non-root)
# Explicit UID/GID 1000 to match docker-compose user: "1000:1000"
RUN groupadd -g 1000 appuser && \
    useradd -u 1000 -g appuser -d /home/appuser -s /bin/bash appuser && \
    mkdir -p /home/appuser && \
    chown -R appuser:appuser /home/appuser

# Install runtime system dependencies
RUN apt-get update && apt-get install -y \
    poppler-utils \
    curl \
    dumb-init \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy Python packages from builder stage
COPY --from=builder /root/.local /home/appuser/.local

# Set working directory
WORKDIR /app

# Create necessary directories with proper permissions
RUN mkdir -p logs uploads temp_uploads && \
    chown -R appuser:appuser /app

# Copy application code
COPY --chown=appuser:appuser ./app ./app

# Switch to non-root user
USER appuser

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Expose application port
EXPOSE ${PORT}

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application with Uvicorn
# Note: Use Gunicorn with Uvicorn workers for production multi-worker setup
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]

# Production command with Gunicorn for better performance (multi-worker)
# Uncomment for production deployment:
# CMD ["gunicorn", "app.main:app", \
#      "--workers", "4", \
#      "--worker-class", "uvicorn.workers.UvicornWorker", \
#      "--bind", "0.0.0.0:8000", \
#      "--access-logfile", "-", \
#      "--error-logfile", "-", \
#      "--timeout", "120", \
#      "--graceful-timeout", "30", \
#      "--keep-alive", "5"]
