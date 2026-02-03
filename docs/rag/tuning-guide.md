# RAG Tuning Guide - Performance Optimization

## Overview

This guide provides technical guidance for optimizing Doctify's RAG (Retrieval-Augmented Generation) system. It covers similarity threshold tuning, performance optimization, and scaling strategies for different dataset sizes.

**Target Audience:** Developers, system administrators, and advanced users responsible for RAG system configuration and optimization.

**Prerequisites:**
- Understanding of vector similarity search
- Familiarity with embedding models
- Basic knowledge of PostgreSQL and pgvector

---

## Table of Contents

1. [Understanding Similarity Thresholds](#understanding-similarity-thresholds)
2. [Parameter Tuning Guidelines](#parameter-tuning-guidelines)
3. [Vector Index Strategies](#vector-index-strategies)
4. [Performance Optimization](#performance-optimization)
5. [Scaling Considerations](#scaling-considerations)
6. [Monitoring and Debugging](#monitoring-and-debugging)
7. [Advanced Configuration](#advanced-configuration)

---

## Understanding Similarity Thresholds

### How Similarity Scoring Works

Doctify uses **cosine similarity** between query embeddings and document chunk embeddings:

```
similarity = 1 - cosine_distance(query_embedding, chunk_embedding)
```

**Similarity Score Range:** 0.0 (completely different) to 1.0 (identical)

### Embedding Model Characteristics

**Current Model:** OpenAI `text-embedding-3-small` (1536 dimensions)

**Typical Score Distribution:**
```
Highly Relevant:     0.65 - 0.85
Relevant:            0.50 - 0.65
Somewhat Relevant:   0.35 - 0.50
Weakly Relevant:     0.25 - 0.35
Not Relevant:        < 0.25
```

**Important:** Different embedding models produce different score distributions. These ranges are specific to `text-embedding-3-small`.

### Why 0.5 is the Default Threshold

Analysis of 100+ real-world queries showed:

- **0.7 threshold:** Excluded 60% of relevant chunks (too strict)
- **0.5 threshold:** Balanced precision and recall (recommended)
- **0.3 threshold:** Included noise, reduced answer quality

**Test Case Evidence:**
```
Query: "What is Doctify?"
Chunk Similarities: [0.695, 0.411, 0.351, 0.336, 0.281]

threshold = 0.7 → 0 chunks returned (FAIL)
threshold = 0.5 → 2 chunks returned (OPTIMAL)
threshold = 0.3 → 5 chunks returned (too noisy)
```

---

## Parameter Tuning Guidelines

### Similarity Threshold Tuning

#### Step 1: Baseline Testing

Test with default threshold (0.5) on representative queries:

```bash
# Run test query
curl -X POST http://localhost:8000/api/v1/rag/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are the security features?",
    "similarity_threshold": 0.5,
    "top_k": 5
  }'
```

**Evaluate:**
- Are retrieved chunks relevant?
- Is answer quality acceptable?
- Check similarity scores in response

#### Step 2: Adjust Based on Results

| Symptom | Current Threshold | Action | New Threshold |
|---------|-------------------|--------|---------------|
| No results returned | 0.5 | Lower threshold | 0.3-0.4 |
| Too many irrelevant chunks | 0.5 | Raise threshold | 0.6-0.7 |
| Answer lacks detail | 0.5 | Lower + increase top_k | 0.4, top_k=10 |
| Answer too verbose | 0.5 | Raise + decrease top_k | 0.6, top_k=3 |

#### Step 3: Domain-Specific Calibration

Different document types may require different thresholds:

```python
# Technical documentation (precise terminology)
threshold_technical = 0.6  # Higher threshold, precise matches

# General business documents (varied vocabulary)
threshold_business = 0.4   # Lower threshold, more permissive

# Legal documents (specific phrasing)
threshold_legal = 0.55     # Medium-high threshold
```

**Implementation:**
```python
# backend/app/services/rag/retrieval_service.py
async def retrieve_context(
    self,
    question: str,
    document_type: Optional[str] = None,
    ...
):
    # Domain-specific threshold adjustment
    threshold = self._get_threshold_for_domain(document_type, base_threshold)
```

### Top K Parameter Tuning

**Top K** controls how many chunks are retrieved and used for answer generation.

#### Optimization Strategy

```python
# Question complexity → Top K recommendation
question_complexity_map = {
    "simple": 3,      # "What is X?"
    "moderate": 5,    # "How does X work?"
    "complex": 10,    # "Compare X and Y in context of Z"
    "comprehensive": 15  # "Explain everything about X"
}
```

#### Performance vs. Quality Trade-offs

| Top K | Response Time | Token Usage | Answer Quality | Use Case |
|-------|---------------|-------------|----------------|----------|
| 1-3   | ~1-2s         | Low (200-500) | Focused | Simple factual queries |
| 5-7   | ~2-4s         | Medium (500-1000) | Balanced | General questions (default) |
| 10-15 | ~4-6s         | High (1000-2000) | Comprehensive | Complex analysis |
| 15-20 | ~6-10s        | Very High (2000-3000) | Maximum context | Research queries |

**Cost Consideration:** Each additional chunk adds ~150-200 tokens to context.

---

## Vector Index Strategies

### Automatic Index Selection

Doctify automatically selects the optimal vector index based on dataset size:

```python
# backend/alembic/versions/20260123_000000_007_fix_vector_index.py

if embedding_count < 100:
    # No index - sequential scan
    # Fastest for small datasets

elif embedding_count < 1000:
    # HNSW index
    # Best quality for small-medium datasets
    CREATE INDEX USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64)

else:
    # IVFFlat index
    # Efficient for large datasets
    lists = min(max(int(sqrt(embedding_count)), 10), 1000)
    CREATE INDEX USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = lists)
```

### Index Performance Characteristics

| Index Type | Dataset Size | Query Time | Build Time | Recall |
|------------|--------------|------------|------------|--------|
| Sequential Scan | < 100 | ~5ms | 0s | 100% |
| HNSW | 100-1K | ~10-20ms | ~30s | 99%+ |
| HNSW | 1K-10K | ~20-50ms | ~5min | 99%+ |
| IVFFlat | 10K-100K | ~30-100ms | ~2-10min | 95-98% |
| IVFFlat | 100K-1M | ~50-200ms | ~10-60min | 95-98% |

### Manual Index Tuning

For datasets > 1M embeddings, tune IVFFlat parameters:

```sql
-- Calculate optimal lists parameter
-- Rule of thumb: lists ≈ sqrt(row_count)

SELECT COUNT(*) FROM document_embeddings;
-- Result: 250,000 embeddings

-- Optimal lists: sqrt(250000) ≈ 500

DROP INDEX IF EXISTS ix_embeddings_vector;
CREATE INDEX ix_embeddings_vector
ON document_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 500);

-- Increase search scope for better recall
SET ivfflat.probes = 10;  -- Default is 1
```

**Trade-off:** Higher `probes` value = better recall but slower queries.

### HNSW Parameter Tuning

For datasets 100-10K, optimize HNSW parameters:

```sql
-- m: Maximum number of connections per layer
-- Higher m = better recall but more memory
-- Default: 16, Range: 4-64

-- ef_construction: Search depth during index build
-- Higher ef_construction = better quality but slower build
-- Default: 64, Range: 32-512

CREATE INDEX ix_embeddings_vector
ON document_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 24, ef_construction = 128);  -- Higher quality

-- Query-time parameter
SET hnsw.ef_search = 100;  -- Default is 40
```

**Memory Impact:** `m = 16` uses ~2KB per embedding, `m = 32` uses ~4KB per embedding.

---

## Performance Optimization

### Query Performance Tuning

#### 1. Connection Pooling

```python
# backend/app/core/config.py
class Settings(BaseSettings):
    # PostgreSQL connection pool
    POSTGRES_POOL_SIZE: int = 20          # Concurrent connections
    POSTGRES_MAX_OVERFLOW: int = 10       # Additional connections
    POSTGRES_POOL_TIMEOUT: int = 30       # Connection timeout (seconds)

    # Async pool (asyncpg)
    POSTGRES_MIN_POOL_SIZE: int = 10
    POSTGRES_MAX_POOL_SIZE: int = 30
```

**Recommendation:** `pool_size = expected_concurrent_users / 2`

#### 2. Embedding Cache

Cache frequently asked questions to avoid re-generating embeddings:

```python
# backend/app/services/rag/embedding_service.py
from functools import lru_cache

class EmbeddingService:
    @lru_cache(maxsize=1000)  # Cache last 1000 query embeddings
    async def generate_embedding(self, text: str) -> List[float]:
        # Cache based on text hash
        ...
```

**Impact:** 100-200ms saved per cached query.

#### 3. Batch Embedding Generation

For bulk document uploads:

```python
# Process chunks in batches
async def generate_embeddings_batch(
    self,
    texts: List[str],
    batch_size: int = 100
) -> List[List[float]]:
    embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        batch_embeddings = await openai_client.embeddings.create(
            input=batch,
            model="text-embedding-3-small"
        )
        embeddings.extend([e.embedding for e in batch_embeddings.data])
    return embeddings
```

**Impact:** 5-10x faster than sequential processing.

### Database Optimization

#### 1. Vacuum and Analyze

Regular maintenance for vector indexes:

```sql
-- Weekly maintenance
VACUUM ANALYZE document_embeddings;

-- After bulk insert/delete
VACUUM FULL document_embeddings;
REINDEX INDEX ix_embeddings_vector;
```

#### 2. Partitioning (Large Datasets)

For > 1M embeddings, partition by document or date:

```sql
-- Partition by document_id (if documents are queried independently)
CREATE TABLE document_embeddings_partitioned (
    LIKE document_embeddings INCLUDING ALL
) PARTITION BY HASH (document_id);

CREATE TABLE document_embeddings_p0 PARTITION OF document_embeddings_partitioned
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);

-- Create partitions p1, p2, p3...
```

**Impact:** 2-4x query speedup for document-specific searches.

#### 3. Prepared Statements

Use prepared statements for repeated queries:

```python
# backend/app/db/repositories/rag.py
async def search_by_embedding(self, ...):
    # Use prepared statement (cached by SQLAlchemy)
    stmt = text("""
        SELECT *, 1 - (embedding <=> CAST(:query_embedding AS vector)) AS similarity
        FROM document_embeddings
        WHERE 1 - (embedding <=> CAST(:query_embedding AS vector)) >= :threshold
        ORDER BY embedding <=> CAST(:query_embedding AS vector)
        LIMIT :limit
    """).bindparams(
        bindparam("query_embedding", type_=String),
        bindparam("threshold", type_=Float),
        bindparam("limit", type_=Integer)
    )
```

---

## Scaling Considerations

### Vertical Scaling (Single Server)

**Hardware Recommendations by Dataset Size:**

| Embeddings | CPU | RAM | Storage | PostgreSQL Config |
|------------|-----|-----|---------|-------------------|
| < 10K | 2 cores | 4GB | 10GB SSD | shared_buffers=1GB |
| 10K-100K | 4 cores | 8GB | 50GB SSD | shared_buffers=2GB |
| 100K-1M | 8 cores | 16GB | 200GB SSD | shared_buffers=4GB |
| > 1M | 16+ cores | 32GB+ | 500GB+ SSD | shared_buffers=8GB |

**PostgreSQL Tuning for RAG:**

```ini
# postgresql.conf

# Memory
shared_buffers = 4GB           # 25% of RAM
effective_cache_size = 12GB    # 75% of RAM
maintenance_work_mem = 1GB
work_mem = 64MB

# Parallel queries
max_parallel_workers_per_gather = 4
max_parallel_workers = 8

# Connection pooling
max_connections = 200
```

### Horizontal Scaling (Distributed)

For > 10M embeddings or high query volume:

#### 1. Read Replicas

```yaml
# docker-compose.prod.yml
services:
  postgres-primary:
    # Write queries (inserts, updates)

  postgres-replica-1:
    # Read queries (RAG searches)

  postgres-replica-2:
    # Read queries (RAG searches)
```

**Load Balancing:**
```python
# Route writes to primary, reads to replicas
if operation == "write":
    db = primary_db
else:
    db = random.choice(replicas)  # Or pgBouncer
```

#### 2. Sharding by Document

For multi-tenant scenarios:

```python
# Shard document embeddings by user_id or project_id
shard_key = user_id % num_shards
db = shard_databases[shard_key]
```

---

## Monitoring and Debugging

### Key Metrics to Monitor

#### 1. Query Performance

```python
# backend/app/services/rag/retrieval_service.py
import logging

logger.info(
    "Vector search completed",
    extra={
        "results_count": len(rows),
        "threshold": similarity_threshold,
        "top_score": rows[0].similarity if rows else 0.0,
        "scores": [round(row.similarity, 3) for row in rows[:5]],
        "query_time_ms": (time.time() - start_time) * 1000
    }
)
```

**What to Track:**
- Query latency (P50, P95, P99)
- Similarity score distribution
- Chunks returned per query
- Cache hit rate

#### 2. Embedding Quality

```sql
-- Check similarity score distribution
SELECT
    CASE
        WHEN similarity >= 0.7 THEN 'High (0.7-1.0)'
        WHEN similarity >= 0.5 THEN 'Medium (0.5-0.7)'
        WHEN similarity >= 0.3 THEN 'Low (0.3-0.5)'
        ELSE 'Very Low (<0.3)'
    END AS score_range,
    COUNT(*) as query_count
FROM (
    -- Recent query results with scores
    SELECT unnest(sources) ->> 'similarity_score' AS similarity
    FROM rag_queries
    WHERE created_at > NOW() - INTERVAL '7 days'
) AS scores
GROUP BY score_range;
```

#### 3. Index Health

```sql
-- Check index size and bloat
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read
FROM pg_stat_user_indexes
WHERE tablename = 'document_embeddings';
```

### Debugging Tools

#### 1. Query Explain

Analyze query execution plans:

```sql
EXPLAIN ANALYZE
SELECT *,
       1 - (embedding <=> '[0.1, 0.2, ...]'::vector) AS similarity
FROM document_embeddings
WHERE 1 - (embedding <=> '[0.1, 0.2, ...]'::vector) >= 0.5
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 5;
```

**Look For:**
- Index usage (should see "Index Scan using ix_embeddings_vector")
- Sequential scan indicates index not used
- Execution time breakdown

#### 2. Logging Configuration

```python
# backend/app/core/config.py
class Settings(BaseSettings):
    LOG_LEVEL: str = "INFO"  # Set to DEBUG for detailed logs

    # Enable SQL query logging (development only)
    SQLALCHEMY_ECHO: bool = False  # Set True to see all SQL queries
```

#### 3. Test Queries

```bash
# Run test suite with specific threshold
cd backend
python ../test_rag_with_threshold.py

# Edge case testing
python ../test_rag_edge_cases.py

# Check logs for similarity scores
docker-compose logs -f backend | grep "Vector search completed"
```

---

## Advanced Configuration

### Custom Embedding Models

To use alternative embedding models:

```python
# backend/app/services/rag/embedding_service.py
class EmbeddingService:
    def __init__(self, model: str = "text-embedding-3-small"):
        self.model = model
        self.dimension = self._get_model_dimension(model)

    def _get_model_dimension(self, model: str) -> int:
        dimensions = {
            "text-embedding-3-small": 1536,
            "text-embedding-3-large": 3072,
            "text-embedding-ada-002": 1536,
        }
        return dimensions.get(model, 1536)
```

**Migration Required:** Changing embedding models requires re-generating all embeddings.

### Hybrid Search (Future Enhancement)

Combine vector search with keyword search:

```sql
-- Hybrid search example (requires implementation)
WITH vector_results AS (
    SELECT id, similarity_score
    FROM vector_search(query_embedding, 0.5, 20)
),
keyword_results AS (
    SELECT id, ts_rank(search_vector, query) AS rank
    FROM document_embeddings, to_tsquery('english', 'search keywords') query
    WHERE search_vector @@ query
)
SELECT
    v.id,
    (0.7 * v.similarity_score + 0.3 * k.rank) AS combined_score
FROM vector_results v
JOIN keyword_results k ON v.id = k.id
ORDER BY combined_score DESC;
```

### Answer Caching

Cache entire RAG responses for identical questions:

```python
# backend/app/services/rag/generation_service.py
from redis import Redis

class GenerationService:
    async def generate_answer(self, question: str, ...):
        # Check cache
        cache_key = f"rag:answer:{hash(question)}"
        cached = await redis_client.get(cache_key)

        if cached:
            return json.loads(cached)

        # Generate answer
        answer = await self._generate_answer(...)

        # Cache for 1 hour
        await redis_client.setex(cache_key, 3600, json.dumps(answer))
        return answer
```

**Impact:** Near-instant responses for repeated questions.

---

## Troubleshooting Guide

### Problem: Very slow queries (> 10 seconds)

**Diagnosis:**
```sql
-- Check if index is being used
EXPLAIN ANALYZE <your_query>;
```

**Solutions:**
1. Verify vector index exists: `\d document_embeddings`
2. Rebuild index: `REINDEX INDEX ix_embeddings_vector;`
3. Increase connection pool size
4. Check PostgreSQL shared_buffers configuration
5. Consider read replicas for high load

---

### Problem: Poor answer quality

**Diagnosis:**
- Check similarity scores in response (should be > 0.4)
- Review retrieved chunks - are they relevant?
- Examine confidence score (should be > 0.6)

**Solutions:**
1. Lower similarity threshold to 0.3-0.4
2. Increase top_k to 10-15
3. Improve document quality (clear OCR, structured content)
4. Use more specific questions
5. Verify correct embedding model

---

### Problem: No results returned

**Diagnosis:**
```python
# Check if embeddings exist
SELECT COUNT(*) FROM document_embeddings;

# Check threshold vs actual scores
# Run query with threshold=0.0 to see all scores
```

**Solutions:**
1. Lower similarity threshold (start with 0.3)
2. Verify documents are uploaded and processed
3. Check if query relates to document content
4. Ensure embeddings were generated (check `embedding IS NOT NULL`)

---

### Problem: High memory usage

**Diagnosis:**
```sql
-- Check index size
SELECT pg_size_pretty(pg_relation_size('ix_embeddings_vector'));

-- Check query memory usage
SELECT * FROM pg_stat_activity WHERE query LIKE '%document_embeddings%';
```

**Solutions:**
1. Use IVFFlat instead of HNSW for large datasets
2. Reduce HNSW `m` parameter
3. Implement partitioning
4. Increase PostgreSQL work_mem
5. Add more RAM to server

---

## Performance Benchmarks

### Query Latency Targets

| Dataset Size | Target P95 | Target P99 | Acceptable Max |
|--------------|------------|------------|----------------|
| < 1K | 50ms | 100ms | 200ms |
| 1K-10K | 100ms | 200ms | 500ms |
| 10K-100K | 200ms | 500ms | 1000ms |
| > 100K | 500ms | 1000ms | 2000ms |

### End-to-End Latency Breakdown

Typical RAG query (5K embeddings, top_k=5):

```
Query Embedding Generation:  150ms  (30%)
Vector Search:               100ms  (20%)
Document Metadata Fetch:      50ms  (10%)
AI Answer Generation:        200ms  (40%)
Total:                       500ms  (100%)
```

**Optimization Priority:**
1. Cache query embeddings (saves 150ms)
2. Optimize vector index (saves 50ms)
3. Use faster AI model (saves 100ms)

---

## Configuration Templates

### Development Environment

```python
# backend/.env
SIMILARITY_THRESHOLD_DEFAULT=0.3  # Permissive for testing
TOP_K_DEFAULT=10                   # More context for debugging
RAG_DEBUG_MODE=true               # Detailed logging
```

### Production Environment

```python
# backend/.env.prod
SIMILARITY_THRESHOLD_DEFAULT=0.5  # Balanced
TOP_K_DEFAULT=5                   # Optimized for cost/performance
RAG_DEBUG_MODE=false              # Minimal logging
POSTGRES_POOL_SIZE=30             # Higher concurrency
REDIS_CACHE_ENABLED=true          # Enable caching
```

### High-Performance Environment

```python
# backend/.env.prod
SIMILARITY_THRESHOLD_DEFAULT=0.55  # Slightly stricter for quality
TOP_K_DEFAULT=7                    # More context
POSTGRES_POOL_SIZE=50              # Maximum concurrency
REDIS_CACHE_ENABLED=true
ANSWER_CACHE_TTL=7200              # 2-hour cache
EMBEDDING_CACHE_SIZE=5000          # Large cache
```

---

## Maintenance Schedule

### Daily

- Monitor query latency metrics
- Check error logs for failed queries
- Verify cache hit rates

### Weekly

- Run `VACUUM ANALYZE` on document_embeddings
- Review similarity score distributions
- Audit slow queries

### Monthly

- Optimize vector index parameters based on growth
- Update embedding model if better options available
- Review and archive old query history
- Benchmark performance against targets

### Quarterly

- Evaluate hardware scaling needs
- Review and adjust similarity thresholds based on feedback
- Plan for dataset growth (index strategy changes)

---

## Further Reading

### Official Documentation

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)

### Research Papers

- "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" (Lewis et al., 2020)
- "Efficient and Robust Approximate Nearest Neighbor Search Using Hierarchical Navigable Small World Graphs" (Malkov & Yashunin, 2018)

### Internal Documentation

- [RAG User Guide](./user-guide.md) - End-user documentation
- [RAG Test Report](../../RAG_TEST_REPORT.md) - Threshold optimization analysis
- [API Documentation](../api/README.md) - RAG API endpoints

---

## Changelog

### Version 1.1 (January 23, 2026)
- Added conditional vector index strategy (migration 007)
- Lowered default similarity threshold from 0.7 to 0.5
- Added comprehensive monitoring and logging
- Documented performance benchmarks and optimization strategies

### Version 1.0 (January 21, 2026)
- Initial RAG tuning guide
- Basic threshold and parameter guidance
- Vector index documentation

---

**Document Version:** 1.1
**Last Updated:** January 23, 2026
**Maintained By:** Doctify Development Team
**For:** Doctify v1.0 (Phase 11 RAG Implementation)
