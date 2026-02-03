-- ===========================================
-- Doctify PostgreSQL Initialization Script
-- ===========================================
-- This script runs once when the database is first created.
-- It sets up extensions and initial configuration.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";  -- pgvector for RAG/embeddings

-- Create custom types if needed
-- (Add any custom ENUM types here)

-- Performance tuning for production
-- Note: These settings should also be in postgresql.conf for persistence
-- ALTER SYSTEM SET shared_buffers = '512MB';
-- ALTER SYSTEM SET effective_cache_size = '1536MB';
-- ALTER SYSTEM SET maintenance_work_mem = '128MB';
-- ALTER SYSTEM SET checkpoint_completion_target = 0.9;
-- ALTER SYSTEM SET wal_buffers = '16MB';
-- ALTER SYSTEM SET default_statistics_target = 100;
-- ALTER SYSTEM SET random_page_cost = 1.1;
-- ALTER SYSTEM SET effective_io_concurrency = 200;
-- ALTER SYSTEM SET work_mem = '4MB';
-- ALTER SYSTEM SET min_wal_size = '1GB';
-- ALTER SYSTEM SET max_wal_size = '4GB';
-- ALTER SYSTEM SET max_worker_processes = 4;
-- ALTER SYSTEM SET max_parallel_workers_per_gather = 2;
-- ALTER SYSTEM SET max_parallel_workers = 4;
-- ALTER SYSTEM SET max_parallel_maintenance_workers = 2;

-- Security: Revoke default public access
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO doctify;
GRANT USAGE ON SCHEMA public TO doctify;

-- Create read-only user for monitoring/reporting (optional)
-- CREATE USER doctify_readonly WITH PASSWORD 'readonly_password';
-- GRANT CONNECT ON DATABASE doctify_production TO doctify_readonly;
-- GRANT USAGE ON SCHEMA public TO doctify_readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO doctify_readonly;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO doctify_readonly;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Doctify database initialized successfully';
    RAISE NOTICE 'Extensions enabled: uuid-ossp, pgcrypto, vector';
END $$;
